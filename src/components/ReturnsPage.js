/**
 * ReturnsPage.js — Dealer App · Return Management
 * ─────────────────────────────────────────────────────────────────────────────
 * Requirements implemented:
 *  1. Only delivered/purchased items appear in the product dropdown
 *  2. Product dropdown shows: Product Name · Order No · Qty · Purchase Date
 *  3. Return form: selected product (read-only), return qty, reason (MULTI-SELECT
 *     chips + optional free-text), optional photo attachment (compressed + preview),
 *     Submit button
 *  4. Success message with ERP sync confirmation
 *  5. Return history with status badges 🟡 Pending 🟢 Approved 🔴 Rejected
 *  6. In-app notification banner when admin acts on a request
 *  7. All data synced to ERP/Admin Panel via MaterialReturn model
 *  8. Optimistic card insert on submit + detailed error surfacing
 *
 * API (all /api/dealer/* — uses dealer JWT):
 *  GET  /orders?status=Order+Placed  → placed orders (line-items become returnable products)
 *  POST /returns                    → create MaterialReturn in ERP
 *  GET  /returns                    → this dealer's return history
 *  GET  /returns/notifications      → dealer notifications
 *  PUT  /returns/notifications/:id/read
 *  PUT  /returns/notifications/read-all
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import apiService from './services/apiService';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  primary:      '#C8102E',
  primaryDark:  '#A0001C',
  primaryLight: '#FDEAED',
  success:      '#059669',
  successLight: '#D1FAE5',
  warning:      '#B45309',
  warningLight: '#FEF3C7',
  danger:       '#DC2626',
  dangerLight:  '#FEF2F2',
  info:         '#1565C0',
  infoLight:    '#E3F0FF',
  purple:       '#7C3AED',
  purpleLight:  '#EDE9FE',
  bg:           '#F5F7FA',
  card:         '#FFFFFF',
  border:       '#E2E8F0',
  text:         '#1A2332',
  textSub:      '#4A5568',
  muted:        '#718096',
};

const shadow = {
  shadowColor: '#000', shadowOpacity: 0.07,
  shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3,
};

// ─── Constants ────────────────────────────────────────────────────────────────
const RETURN_REASONS = [
  'Damaged', 'Wrong item', 'Excess quantity', 'Quality issue', 'Other',
];

const HISTORY_FILTERS = [
  { label: 'All',        value: '' },
  { label: '🟡 Pending', value: 'REQUEST_RAISED' },
  { label: '🟢 Approved',value: 'APPROVED' },
  { label: '🔴 Rejected', value: 'REJECTED' },
  { label: 'In Transit', value: 'IN_TRANSIT' },
  { label: 'Closed ✓',   value: 'CLOSED' },
];

// Photo compression settings — keeps upload small & fast without visible quality loss
const PHOTO_PICKER_OPTIONS = {
  mediaType: 'photo',
  quality: 0.5,        // 0–1, lower = smaller file
  maxWidth: 1280,
  maxHeight: 1280,
  includeBase64: false,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const dash = v => (v != null && String(v).trim() !== '' ? String(v) : '—');

const fmtDate = d => {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d);
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return String(d); }
};

const fmtCurrency = n => {
  const num = Number(n);
  if (isNaN(num) || n == null) return '—';
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

const timeAgo = d => {
  if (!d) return '';
  try {
    const ms   = Date.now() - new Date(d).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 1)  return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    return fmtDate(d);
  } catch { return ''; }
};

// Normalizes whatever the server / optimistic-insert gives us into the shape
// ReturnCard / ReturnDetailModal expect, so the card always renders correctly
// no matter which field names the backend used.
const normalizeReturn = raw => {
  if (!raw) return raw;
  return {
    ...raw,
    _id:            raw._id || raw.id || raw.mrId,
    mrId:           raw.mrId || raw.docketId || raw._id || raw.id,
    // Backend MaterialReturn model stores the human-readable order ID as `orderNo`
    // The POST payload sends it as `orderId`, and optimistic inserts may have either
    orderNo:        raw.orderNo || raw.orderId || raw.order_no || raw.orderMongoId || '—',
    productName:    raw.productName || raw.name || '—',
    returnQty:      raw.returnQty ?? raw.qty ?? raw.quantity ?? '—',
    reason:         raw.reason || raw.reasons || '—',
    returnDate:     raw.returnDate || raw.createdAt || new Date().toISOString(),
    approvalStatus: raw.approvalStatus || 'Pending',
    currentStage:   raw.currentStage || 'REQUEST_RAISED',
  };
};

// ─── Status badge config ──────────────────────────────────────────────────────
// Maps approvalStatus / currentStage → badge colours + emoji
const statusBadge = (approvalStatus, currentStage) => {
  const a = (approvalStatus || '').toLowerCase();
  const s = (currentStage  || '').toUpperCase();

  if (a === 'approved' || s === 'APPROVED')
    return { emoji: '🟢', label: 'Approved',      color: C.success, bg: C.successLight };
  if (a === 'rejected')
    return { emoji: '🔴', label: 'Rejected',      color: C.danger,  bg: C.dangerLight  };
  if (s === 'CLOSED')
    return { emoji: '🟢', label: 'Closed',        color: C.success, bg: C.successLight };
  if (['IN_TRANSIT','OUT_FOR_PICKUP','PICKED_UP'].includes(s))
    return { emoji: '🟡', label: 'In Transit',    color: C.warning, bg: C.warningLight };
  if (['DOCKET_CREATED','VEHICLE_ASSIGNED'].includes(s))
    return { emoji: '🟡', label: 'Processing',    color: C.purple,  bg: C.purpleLight  };
  if (['ARRIVED_AT_WAREHOUSE','RECEIVED','QC_PENDING','QC_PASSED','INVENTORY_UPDATED','FINANCE_PENDING'].includes(s))
    return { emoji: '🟡', label: 'Under Review',  color: C.info,    bg: C.infoLight    };
  if (s === 'QC_FAILED')
    return { emoji: '🔴', label: 'QC Failed',     color: C.danger,  bg: C.dangerLight  };
  // default — pending
  return { emoji: '🟡', label: 'Pending',         color: C.warning, bg: C.warningLight };
};

// stage timeline label
const stageLabel = s => ({
  REQUEST_RAISED:       'Pending Review',
  APPROVED:             'Approved',
  DOCKET_CREATED:       'Docket Created',
  VEHICLE_ASSIGNED:     'Vehicle Assigned',
  OUT_FOR_PICKUP:       'Out for Pickup',
  PICKED_UP:            'Picked Up',
  IN_TRANSIT:           'In Transit',
  ARRIVED_AT_WAREHOUSE: 'At Warehouse',
  RECEIVED:             'Received',
  QC_PENDING:           'QC Pending',
  QC_PASSED:            'QC Passed',
  QC_FAILED:            'QC Failed',
  INVENTORY_UPDATED:    'Inventory Updated',
  FINANCE_PENDING:      'Finance Pending',
  CLOSED:               'Closed',
}[(s || '').toUpperCase()] || (s || '—'));

// ─── Skeleton Card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <View style={sk.card}>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
        <View style={[sk.s, { width: 36, height: 36, borderRadius: 10 }]} />
        <View style={{ flex: 1 }}>
          <View style={[sk.s, { width: '60%', height: 13, marginBottom: 6 }]} />
          <View style={[sk.s, { width: '35%', height: 10 }]} />
        </View>
        <View style={[sk.s, { width: 72, height: 24, borderRadius: 12 }]} />
      </View>
      <View style={[sk.s, { height: 1, marginBottom: 12 }]} />
      <View style={[sk.s, { width: '80%', height: 11, marginBottom: 10 }]} />
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
        <View style={[sk.s, { flex: 1, height: 44, borderRadius: 10 }]} />
        <View style={[sk.s, { flex: 1, height: 44, borderRadius: 10 }]} />
      </View>
      <View style={[sk.s, { height: 38, borderRadius: 10 }]} />
    </View>
  );
}
const sk = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 14, ...shadow },
  s:    { backgroundColor: '#E2E8F0', borderRadius: 6 },
});

// ─── Notification Banner ──────────────────────────────────────────────────────
function NotifBanner({ notif, onDismiss }) {
  const isApproved = notif.type === 'return_approved';
  const col  = isApproved ? C.success : C.danger;
  const bg   = isApproved ? C.successLight : C.dangerLight;
  const icon = isApproved ? 'check-circle' : 'close-circle';

  useEffect(() => {
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Pressable style={[nb.wrap, { backgroundColor: bg, borderColor: col + '40' }]} onPress={onDismiss}>
      <Icon name={icon} size={20} color={col} />
      <View style={{ flex: 1 }}>
        <Text style={[nb.title, { color: col }]}>{notif.title}</Text>
        <Text style={[nb.msg, { color: col }]} numberOfLines={2}>{notif.message}</Text>
      </View>
      <Icon name="close" size={15} color={col} />
    </Pressable>
  );
}
const nb = StyleSheet.create({
  wrap:  { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 14, marginBottom: 0, borderRadius: 14, padding: 14, borderWidth: 1, ...shadow },
  title: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
  msg:   { fontSize: 12, lineHeight: 17, opacity: 0.85 },
});

// ─── Return History Card ──────────────────────────────────────────────────────
function ReturnCard({ item, onPress }) {
  const badge = statusBadge(item.approvalStatus, item.currentStage);
  const isRejected = (item.approvalStatus || '').toLowerCase() === 'rejected';

  return (
    <Pressable style={rc.card} onPress={() => onPress(item)} android_ripple={{ color: '#F5F5F5' }}>
      {/* Left colour accent */}
      <View style={[rc.accent, { backgroundColor: badge.color }]} />

      <View style={rc.body}>
        {/* Header */}
        <View style={rc.headerRow}>
          <View style={[rc.avatar, { backgroundColor: C.primaryLight }]}>
            <Icon name="keyboard-return" size={17} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={rc.mrId}>{dash(item.mrId)}</Text>
            <Text style={rc.date}>{fmtDate(item.returnDate || item.createdAt)}</Text>
          </View>
          {/* Status badge with emoji */}
          <View style={[rc.badge, { backgroundColor: badge.bg }]}>
            <Text style={[rc.badgeTxt, { color: badge.color }]}>
              {badge.emoji} {badge.label}
            </Text>
          </View>
        </View>

        <View style={rc.divider} />

        {/* Product name */}
        <View style={rc.productRow}>
          <Icon name="package-variant" size={13} color={C.primary} />
          <Text style={rc.productName} numberOfLines={2}>{dash(item.productName)}</Text>
        </View>

        {/* Info grid */}
        <View style={rc.grid}>
          <View style={rc.chip}>
            <Text style={rc.chipLbl}>Order No</Text>
            <Text style={rc.chipVal} numberOfLines={1}>{dash(item.orderNo)}</Text>
          </View>
          <View style={rc.chip}>
            <Text style={rc.chipLbl}>Qty Returned</Text>
            <Text style={rc.chipVal}>{dash(item.returnQty)}</Text>
          </View>
        </View>

        {/* Reason */}
        <View style={rc.grid}>
          <View style={[rc.chip, { flex: 1 }]}>
            <Text style={rc.chipLbl}>Return Reason</Text>
            <Text style={rc.chipVal} numberOfLines={2}>{dash(item.reason)}</Text>
          </View>
          <View style={rc.chip}>
            <Text style={rc.chipLbl}>Return Date</Text>
            <Text style={rc.chipVal}>{fmtDate(item.returnDate || item.createdAt)}</Text>
          </View>
        </View>

        {/* Photo thumbnail if attached */}
        {item.photoUrl ? (
          <View style={rc.photoRow}>
            <Image source={{ uri: item.photoUrl }} style={rc.photoThumb} resizeMode="cover" />
            <Text style={rc.photoLbl}>
              <Icon name="camera" size={11} color={C.muted} />  Photo attached
            </Text>
          </View>
        ) : null}

        {/* Rejection notice */}
        {isRejected && (
          <View style={rc.rejectBox}>
            <Icon name="alert-circle-outline" size={13} color={C.danger} />
            <Text style={rc.rejectTxt}>
              {item.remarks || 'Please contact the administrator for more information.'}
            </Text>
          </View>
        )}

        {/* Docket / Credit Note if present */}
        {(item.docketId && item.docketId !== 'PENDING') || item.creditNoteNo ? (
          <View style={rc.grid}>
            {item.docketId && item.docketId !== 'PENDING' && (
              <View style={[rc.chip, { borderColor: C.purple + '40', backgroundColor: C.purple + '08' }]}>
                <Text style={[rc.chipLbl, { color: C.purple }]}>Docket ID</Text>
                <Text style={rc.chipVal} numberOfLines={1}>{item.docketId}</Text>
              </View>
            )}
            {item.creditNoteNo ? (
              <View style={[rc.chip, { borderColor: C.success + '40', backgroundColor: C.success + '08' }]}>
                <Text style={[rc.chipLbl, { color: C.success }]}>Credit Note</Text>
                <Text style={rc.chipVal} numberOfLines={1}>{item.creditNoteNo}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Footer */}
        <View style={rc.footer}>
          <Icon name="information-outline" size={11} color={C.muted} />
          <Text style={rc.footerTxt}>Tap to view full details and timeline</Text>
          <Icon name="chevron-right" size={15} color={C.muted} />
        </View>
      </View>
    </Pressable>
  );
}

const rc = StyleSheet.create({
  card:       { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, marginBottom: 14, overflow: 'hidden', ...shadow },
  accent:     { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  body:       { padding: 16, paddingLeft: 20 },
  headerRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  avatar:     { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  mrId:       { color: C.text, fontSize: 14, fontWeight: '900' },
  date:       { color: C.muted, fontSize: 11, marginTop: 2 },
  badge:      { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  badgeTxt:   { fontSize: 11, fontWeight: '800' },
  divider:    { height: 1, backgroundColor: C.border, marginBottom: 12 },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FAFBFC', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 10, borderWidth: 1, borderColor: '#F0F2F5' },
  productName:{ flex: 1, color: C.text, fontSize: 13, fontWeight: '700', lineHeight: 18 },
  grid:       { flexDirection: 'row', gap: 10, marginBottom: 10 },
  chip:       { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: C.border },
  chipLbl:    { color: C.muted, fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  chipVal:    { color: C.text, fontSize: 12, fontWeight: '800' },
  photoRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  photoThumb: { width: 40, height: 40, borderRadius: 8, borderWidth: 1, borderColor: C.border },
  photoLbl:   { color: C.muted, fontSize: 11, fontWeight: '600' },
  rejectBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 7, backgroundColor: C.dangerLight, borderRadius: 9, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: '#FECACA' },
  rejectTxt:  { flex: 1, color: C.danger, fontSize: 12, fontWeight: '600', lineHeight: 17 },
  footer:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F3F5' },
  footerTxt:  { flex: 1, color: C.muted, fontSize: 11 },
});

// ─── Return Detail Modal ──────────────────────────────────────────────────────
function ReturnDetailModal({ item, visible, onClose }) {
  if (!item) return null;
  const badge    = statusBadge(item.approvalStatus, item.currentStage);
  const timeline = Array.isArray(item.stageTimeline) ? item.stageTimeline : [];

  const rows = [
    ['MR / Docket ID', item.mrId],
    ['Order No',       item.orderNo],
    ['Invoice No',     item.invoiceNo],
    ['Product',        item.productName],
    ['SKU',            item.skuCode],
    ['Qty Returned',   item.returnQty],
    ['Ordered Qty',    item.orderedQty],
    ['Unit Price',     item.unitPrice ? fmtCurrency(item.unitPrice) : null],
    ['Return Value',   item.value     ? fmtCurrency(item.value)     : null],
    ['Reason',         item.reason],
    ['Remarks',        item.remarks],
    ['Docket ID',      item.docketId && item.docketId !== 'PENDING' ? item.docketId : null],
    ['Credit Note',    item.creditNoteNo],
    ['Debit Note',     item.debitNoteNo],
    ['Raised On',      fmtDate(item.returnDate || item.createdAt)],
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={dd.overlay}>
        <View style={dd.sheet}>
          <View style={dd.handle} />

          {/* Header */}
          <View style={dd.hdr}>
            <View style={[dd.avatar, { backgroundColor: C.primaryLight }]}>
              <Icon name="keyboard-return" size={20} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={dd.ttl}>{dash(item.mrId)}</Text>
              <Text style={dd.sub} numberOfLines={1}>{dash(item.productName)}</Text>
            </View>
            <Pressable style={dd.xBtn} onPress={onClose}>
              <Icon name="close" size={20} color={C.muted} />
            </Pressable>
          </View>

          {/* Status badge */}
          <View style={[dd.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[dd.statusTxt, { color: badge.color }]}>
              {badge.emoji}  {badge.label}
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Photo attachment preview */}
            {item.photoUrl ? (
              <>
                <Text style={dd.secHdr}>Attached Photo</Text>
                <Image source={{ uri: item.photoUrl }} style={dd.photoFull} resizeMode="cover" />
              </>
            ) : null}

            {/* Details table */}
            <Text style={dd.secHdr}>Return Details</Text>
            <View style={dd.table}>
              {rows.map(([lbl, val]) =>
                val != null && String(val).trim() !== '' ? (
                  <View key={lbl} style={dd.row}>
                    <Text style={dd.rowLbl}>{lbl}</Text>
                    <Text style={dd.rowVal}>{dash(val)}</Text>
                  </View>
                ) : null
              )}
            </View>

            {/* Stage timeline */}
            {timeline.length > 0 && (
              <>
                <Text style={[dd.secHdr, { marginTop: 20 }]}>Stage Timeline</Text>
                {timeline.map((t, i) => {
                  const isLast = i === timeline.length - 1;
                  const col = t.stage === 'REQUEST_RAISED' && item.approvalStatus === 'Rejected'
                    ? C.danger : C.success;
                  return (
                    <View key={i} style={dd.tlRow}>
                      <View style={dd.tlLeft}>
                        <View style={[dd.tlDot, { backgroundColor: col }]} />
                        {!isLast && <View style={dd.tlLine} />}
                      </View>
                      <View style={[dd.tlCard, { marginBottom: isLast ? 0 : 12 }]}>
                        <Text style={[dd.tlStage, { color: col }]}>{stageLabel(t.stage)}</Text>
                        {t.remarks ? <Text style={dd.tlRemark}>{t.remarks}</Text> : null}
                        <Text style={dd.tlDate}>
                          {t.user ? `${t.user} · ` : ''}{fmtDate(t.timestamp || t.at)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </>
            )}
            <View style={{ height: 30 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const dd = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 36, maxHeight: '92%' },
  handle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 18 },
  hdr:        { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatar:     { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  ttl:        { color: C.text, fontSize: 17, fontWeight: '900' },
  sub:        { color: C.muted, fontSize: 12, marginTop: 2 },
  xBtn:       { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  statusBadge:{ alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 18 },
  statusTxt:  { fontSize: 14, fontWeight: '900' },
  secHdr:     { color: C.primary, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 },
  photoFull:  { width: '100%', height: 180, borderRadius: 14, marginBottom: 18, borderWidth: 1, borderColor: C.border },
  table:      { backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 4 },
  row:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F1F3F5' },
  rowLbl:     { color: C.muted, fontSize: 12, fontWeight: '600', flex: 1 },
  rowVal:     { color: C.text, fontSize: 13, fontWeight: '700', flex: 1.4, textAlign: 'right' },
  tlRow:      { flexDirection: 'row', gap: 12 },
  tlLeft:     { alignItems: 'center', width: 20 },
  tlDot:      { width: 14, height: 14, borderRadius: 7, marginTop: 2 },
  tlLine:     { flex: 1, width: 2, backgroundColor: C.border, marginVertical: 3 },
  tlCard:     { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.border },
  tlStage:    { fontSize: 13, fontWeight: '800', marginBottom: 4 },
  tlRemark:   { color: C.textSub, fontSize: 12, lineHeight: 17, marginBottom: 4 },
  tlDate:     { color: C.muted, fontSize: 10, fontWeight: '600' },
});

// ─── Product Picker Modal ─────────────────────────────────────────────────────
// Flat searchable list of all eligible products across delivered orders.
function ProductPickerModal({ visible, onClose, onSelect }) {
  const [products,  setProducts]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [search,    setSearch]    = useState('');

  useEffect(() => {
    if (visible) { setSearch(''); fetchProducts(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Fetch all eligible (delivered) products via the dedicated endpoint.
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await apiService.get('/returns/eligible-products');
      const flat = Array.isArray(res?.data) ? res.data : [];
      setProducts(flat);
    } catch (err) {
      console.error('[Returns] fetchProducts (eligible-products) error:', err?.message || err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = search.trim()
    ? products.filter(p =>
        p.productName.toLowerCase().includes(search.toLowerCase()) ||
        p.orderId.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku || '').toLowerCase().includes(search.toLowerCase())
      )
    : products;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={pp.overlay}>
        <View style={pp.sheet}>
          <View style={pp.handle} />

          {/* Header */}
          <View style={pp.hdr}>
            <View style={[pp.avatar, { backgroundColor: C.primaryLight }]}>
              <Icon name="package-search" size={18} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={pp.ttl}>Select Item to Return</Text>
              <Text style={pp.sub}>Items from your delivered orders</Text>
            </View>
            <Pressable style={pp.xBtn} onPress={onClose}>
              <Icon name="close" size={20} color={C.muted} />
            </Pressable>
          </View>

          {/* Search */}
          <View style={pp.searchBox}>
            <Icon name="magnify" size={18} color={C.muted} />
            <TextInput
              style={pp.searchIn}
              value={search}
              onChangeText={setSearch}
              placeholder="Search product name, order ID, SKU…"
              placeholderTextColor={C.muted}
              autoFocus
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')}>
                <Icon name="close-circle" size={16} color={C.muted} />
              </Pressable>
            )}
          </View>

          {/* List */}
          {loading ? (
            <View style={pp.center}>
              <ActivityIndicator color={C.primary} size="large" />
              <Text style={pp.loadTxt}>Loading delivered orders…</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={pp.center}>
              <Icon name="package-variant-closed" size={52} color={C.border} />
              <Text style={pp.emptyTtl}>
                {search ? 'No products match your search' : 'No delivered orders found'}
              </Text>
              <Text style={pp.emptySub}>
                Returns can only be raised for delivered orders.
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={item => item.key}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
              renderItem={({ item }) => (
                <Pressable
                  style={pp.row}
                  onPress={() => onSelect(item)}
                  android_ripple={{ color: '#F0F0F0' }}>
                  {/* Icon */}
                  <View style={[pp.rowIcon, { backgroundColor: C.infoLight }]}>
                    <Icon name="package-variant" size={18} color={C.info} />
                  </View>

                  {/* Product info */}
                  <View style={{ flex: 1 }}>
                    <Text style={pp.pName} numberOfLines={2}>{item.productName}</Text>
                    <View style={pp.metaRow}>
                      <Icon name="receipt" size={10} color={C.muted} />
                      <Text style={pp.metaTxt}>Order: {item.orderId}</Text>
                      {item.sku ? (
                        <>
                          <Text style={pp.dot}>·</Text>
                          <Text style={pp.metaTxt}>SKU: {item.sku}</Text>
                        </>
                      ) : null}
                    </View>
                    <View style={pp.metaRow}>
                      <Icon name="counter" size={10} color={C.muted} />
                      <Text style={pp.metaTxt}>Ordered Qty: {item.quantity}</Text>
                      {item.orderDate ? (
                        <>
                          <Text style={pp.dot}>·</Text>
                          <Icon name="calendar-outline" size={10} color={C.muted} />
                          <Text style={pp.metaTxt}>{fmtDate(item.orderDate)}</Text>
                        </>
                      ) : null}
                    </View>
                  </View>

                  {/* Price + chevron */}
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    {item.unitPrice > 0 && (
                      <Text style={pp.price}>{fmtCurrency(item.unitPrice)}</Text>
                    )}
                    <Icon name="chevron-right" size={18} color={C.muted} />
                  </View>
                </Pressable>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const pp = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet:    { backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24, maxHeight: '92%' },
  handle:   { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 18 },
  hdr:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  avatar:   { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  ttl:      { color: C.text, fontSize: 17, fontWeight: '900' },
  sub:      { color: C.muted, fontSize: 12, marginTop: 1 },
  xBtn:     { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  searchBox:{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 12, height: 44, marginBottom: 14 },
  searchIn: { flex: 1, color: C.text, fontSize: 13 },
  center:   { alignItems: 'center', paddingVertical: 48 },
  loadTxt:  { color: C.muted, fontSize: 13, marginTop: 12 },
  emptyTtl: { color: C.text, fontSize: 15, fontWeight: '700', marginTop: 14, textAlign: 'center' },
  emptySub: { color: C.muted, fontSize: 12, marginTop: 6, textAlign: 'center', paddingHorizontal: 24, lineHeight: 18 },
  row:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  rowIcon:  { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pName:    { color: C.text, fontSize: 14, fontWeight: '800', lineHeight: 19, marginBottom: 4 },
  metaRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  metaTxt:  { color: C.muted, fontSize: 11, fontWeight: '600' },
  dot:      { color: C.muted, fontSize: 11 },
  price:    { color: C.primary, fontSize: 12, fontWeight: '800' },
});

// ─── New Return Form Modal ────────────────────────────────────────────────────
function NewReturnModal({ visible, onClose, onSubmitted }) {
  const [showPicker,     setShowPicker]     = useState(false);
  const [product,        setProduct]        = useState(null);   // selected flat product
  const [returnQty,      setReturnQty]      = useState('');
  const [selectedReasons,setSelectedReasons]= useState([]);      // MULTI-SELECT chips
  const [customReason,   setCustomReason]   = useState('');      // extra free-text reason
  const [remarks,        setRemarks]        = useState('');
  const [photo,          setPhoto]          = useState(null);    // { uri, fileName, type, fileSize }
  const [compressing,    setCompressing]    = useState(false);
  const [submitting,     setSubmitting]     = useState(false);

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      setShowPicker(false);
      setProduct(null);
      setReturnQty('');
      setSelectedReasons([]);
      setCustomReason('');
      setRemarks('');
      setPhoto(null);
    }
  }, [visible]);

  const handleClose = () => { if (!submitting) onClose(); };

  const handleSelectProduct = p => {
    setProduct(p);
    setReturnQty('1');   // default to 1 — dealer will specify exact return qty
    setShowPicker(false);
  };

  // Toggle a reason chip on/off — supports selecting MULTIPLE reasons at once
  const toggleReason = r => {
    setSelectedReasons(prev =>
      prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]
    );
  };

  // Pick + auto-compress photo (smaller maxWidth/maxHeight + quality = compression)
  const pickPhoto = async () => {
    try {
      setCompressing(true);
      const result = await launchImageLibrary(PHOTO_PICKER_OPTIONS);
      if (!result.didCancel && result.assets?.[0]?.uri) {
        const asset = result.assets[0];
        setPhoto({
          uri: asset.uri,
          fileName: asset.fileName || `return_${Date.now()}.jpg`,
          type: asset.type || 'image/jpeg',
          fileSize: asset.fileSize,
        });
      }
    } catch (err) {
      console.error('[Returns] pickPhoto error:', err?.message || err);
      Alert.alert('Photo Error', 'Could not open photo library.');
    } finally {
      setCompressing(false);
    }
  };

  const handleSubmit = async () => {
    // --- Validation ---
    if (!product) {
      Alert.alert('Select Product', 'Please select a product to return.');
      return;
    }

    // Guard: orderId must exist (comes from placed order)
    const safeOrderId = String(product.orderId || product.orderMongoId || '').trim();
    if (!safeOrderId) {
      Alert.alert('Missing Order ID', 'Could not determine the order ID for this item. Please re-select the product.');
      return;
    }

    // Guard: productName must exist
    const safeProductName = String(product.productName || '').trim();
    if (!safeProductName) {
      Alert.alert('Missing Product', 'Could not determine the product name. Please re-select the product.');
      return;
    }

    const combinedReason = [...selectedReasons, customReason.trim()].filter(Boolean).join(', ');
    if (!combinedReason) {
      Alert.alert('Reason Required', 'Please select at least one reason (or describe it) for the return.');
      return;
    }

    const qty = parseInt(returnQty, 10);
    const max = product.quantity || 0;
    if (!qty || qty <= 0) {
      Alert.alert('Invalid Quantity', 'Return quantity must be at least 1.');
      return;
    }
    if (max > 0 && qty > max) {
      Alert.alert('Quantity Exceeded', `Return quantity cannot exceed ordered quantity (${max}).`);
      return;
    }

    setSubmitting(true);

    const payload = {
      orderId:      safeOrderId,
      orderMongoId: product.orderMongoId || '',
      productName:  safeProductName,
      sku:          product.sku || '',
      orderedQty:   product.quantity || qty,
      returnQty:    qty,
      reason:       combinedReason,
      remarks:      remarks.trim(),
      unitPrice:    product.unitPrice || 0,
      value:        (product.unitPrice || 0) * qty,
    };

    // Log payload for debugging
    console.log('[Returns] Submitting payload:', JSON.stringify(payload));

    try {
      let res;

      if (photo?.uri) {
        // Photo present → send as multipart/form-data
        const form = new FormData();
        Object.entries(payload).forEach(([k, v]) => form.append(k, String(v)));
        form.append('photo', {
          uri: Platform.OS === 'android' ? photo.uri : photo.uri.replace('file://', ''),
          name: photo.fileName,
          type: photo.type,
        });
        // Use request directly so we can pass multipart header
        res = await apiService.request('/returns', {
          method: 'POST',
          body: form,
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        res = await apiService.post('/returns', payload);
      }

      if (res?.success) {
        onClose();
        onSubmitted(res.data || payload, payload);
      } else {
        const serverMsg = res?.message || res?.error || 'Please check the details and try again.';
        console.error('[Returns] create failed — server response:', res);
        Alert.alert('Submission Failed', serverMsg);
      }
    } catch (err) {
      console.error('[Returns] create return request error:', {
        message: err?.message,
        response: err?.response?.data,
        status: err?.response?.status,
      });
      const serverMsg = err?.response?.data?.message || err?.message || 'Failed to submit return request.';
      Alert.alert('Error', serverMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const max = product?.quantity || 0;

  return (
    <>
      {/* Product Picker */}
      <ProductPickerModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={handleSelectProduct}
      />

      <Modal visible={visible && !showPicker} transparent animationType="slide" onRequestClose={handleClose}>
        <View style={nf.overlay}>
          <View style={nf.sheet}>
            <View style={nf.handle} />

            {/* Header */}
            <View style={nf.hdr}>
              <View style={[nf.avatar, { backgroundColor: C.primaryLight }]}>
                <Icon name="keyboard-return" size={20} color={C.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={nf.ttl}>New Return Request</Text>
                <Text style={nf.sub}>Select a delivered order item to return</Text>
              </View>
              <Pressable style={nf.xBtn} onPress={handleClose} disabled={submitting}>
                <Icon name="close" size={20} color={C.muted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* ── Product selector ── */}
              <Text style={nf.label}>Product <Text style={{ color: C.primary }}>*</Text></Text>
              <Pressable style={nf.productBtn} onPress={() => setShowPicker(true)}>
                {product ? (
                  <View style={{ flex: 1 }}>
                    <Text style={nf.productBtnName} numberOfLines={1}>{product.productName}</Text>
                    <Text style={nf.productBtnMeta}>
                      Order: {product.orderId}  ·  Ordered Qty: {product.quantity}
                      {product.orderDate ? `  ·  ${fmtDate(product.orderDate)}` : ''}
                    </Text>
                  </View>
                ) : (
                  <Text style={nf.productPlaceholder}>Tap to select a product…</Text>
                )}
                <Icon name={product ? 'pencil-outline' : 'chevron-down'} size={18} color={C.primary} />
              </Pressable>

              {/* ── Qty ── */}
              <Text style={nf.label}>Return Quantity <Text style={{ color: C.primary }}>*</Text></Text>
              <View style={nf.qtyRow}>
                <Pressable
                  style={[nf.qtyBtn, !product && { opacity: 0.4 }]}
                  onPress={() => setReturnQty(v => String(Math.max(1, parseInt(v || 1, 10) - 1)))}
                  disabled={!product}>
                  <Icon name="minus" size={18} color={C.primary} />
                </Pressable>
                <TextInput
                  style={nf.qtyInput}
                  value={returnQty}
                  onChangeText={setReturnQty}
                  keyboardType="numeric"
                  maxLength={5}
                  editable={!!product}
                />
                <Pressable
                  style={[nf.qtyBtn, !product && { opacity: 0.4 }]}
                  onPress={() => {
                    const next = parseInt(returnQty || 0, 10) + 1;
                    setReturnQty(max > 0 ? String(Math.min(next, max)) : String(next));
                  }}
                  disabled={!product}>
                  <Icon name="plus" size={18} color={C.primary} />
                </Pressable>
                {max > 0 && (
                  <Pressable style={nf.fullBtn} onPress={() => setReturnQty(String(max))}>
                    <Text style={nf.fullBtnTxt}>Full ({max})</Text>
                  </Pressable>
                )}
              </View>
              {max > 0 && (
                <Text style={nf.qtyHint}>Max returnable: {max} units</Text>
              )}

              {/* ── Reason (MULTI-SELECT chips) ── */}
              <Text style={nf.label}>
                Reason for Return <Text style={{ color: C.primary }}>*</Text>{' '}
                <Text style={{ color: C.muted, fontWeight: '500', fontSize: 11 }}>(select one or more)</Text>
              </Text>
              <View style={nf.chipWrap}>
                {RETURN_REASONS.map(r => {
                  const active = selectedReasons.includes(r);
                  return (
                    <Pressable
                      key={r}
                      style={[nf.chip, active && { backgroundColor: C.primary, borderColor: C.primary }]}
                      onPress={() => toggleReason(r)}>
                      {active && <Icon name="check" size={13} color="#FFF" style={{ marginRight: 4 }} />}
                      <Text style={[nf.chipTxt, active && { color: '#FFF' }]}>{r}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {selectedReasons.length > 0 && (
                <Text style={nf.selectedHint}>
                  Selected: {selectedReasons.join(', ')}
                </Text>
              )}
              {/* Free-text extra detail — appended to the selected reasons above */}
              <TextInput
                style={nf.reasonInput}
                value={customReason}
                onChangeText={setCustomReason}
                placeholder="Add more detail (optional)…"
                placeholderTextColor={C.muted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              {/* ── Optional remarks ── */}
              <Text style={nf.label}>Additional Remarks <Text style={{ color: C.muted }}>(optional)</Text></Text>
              <TextInput
                style={[nf.reasonInput, { minHeight: 60, marginBottom: 14 }]}
                value={remarks}
                onChangeText={setRemarks}
                placeholder="Any extra notes for the admin…"
                placeholderTextColor={C.muted}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />

              {/* ── Photo attachment (with compression + preview) ── */}
              <Text style={nf.label}>Photo Attachment <Text style={{ color: C.muted }}>(optional)</Text></Text>
              {photo ? (
                <View style={nf.photoPreviewWrap}>
                  <Image source={{ uri: photo.uri }} style={nf.photoPreview} resizeMode="cover" />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Icon name="check-circle" size={16} color={C.success} />
                      <Text style={[nf.photoTxt, { color: C.success }]}>Photo compressed & ready</Text>
                    </View>
                    {photo.fileSize ? (
                      <Text style={nf.photoSize}>{(photo.fileSize / 1024).toFixed(0)} KB</Text>
                    ) : null}
                    <Pressable onPress={() => setPhoto(null)} style={{ marginTop: 6, alignSelf: 'flex-start' }}>
                      <Text style={{ color: C.danger, fontSize: 12, fontWeight: '700' }}>Remove photo</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable style={nf.photoBtn} onPress={pickPhoto} disabled={compressing}>
                  {compressing ? (
                    <>
                      <ActivityIndicator size="small" color={C.primary} />
                      <Text style={nf.photoTxt}>Compressing photo…</Text>
                    </>
                  ) : (
                    <>
                      <Icon name="camera-plus-outline" size={20} color={C.primary} />
                      <Text style={nf.photoTxt}>Upload photo of damaged / wrong item</Text>
                    </>
                  )}
                </Pressable>
              )}

              {/* ── Submit ── */}
              <View style={nf.btnRow}>
                <Pressable style={nf.cancelBtn} onPress={handleClose} disabled={submitting}>
                  <Text style={nf.cancelTxt}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[nf.submitBtn, submitting && { opacity: 0.75 }]}
                  onPress={handleSubmit}
                  disabled={submitting}>
                  {submitting
                    ? <ActivityIndicator size="small" color="#FFF" />
                    : <>
                        <Icon name="send-outline" size={16} color="#FFF" style={{ marginRight: 6 }} />
                        <Text style={nf.submitTxt}>Submit Return</Text>
                      </>
                  }
                </Pressable>
              </View>

              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const nf = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet:        { backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 28, maxHeight: '96%' },
  handle:       { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 18 },
  hdr:          { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  avatar:       { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  ttl:          { color: C.text, fontSize: 17, fontWeight: '900' },
  sub:          { color: C.muted, fontSize: 12, marginTop: 1 },
  xBtn:         { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  label:        { color: C.textSub, fontSize: 12, fontWeight: '700', marginBottom: 8, marginTop: 4 },
  productBtn:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1.5, borderColor: C.border, padding: 14, marginBottom: 18 },
  productBtnName:{ color: C.text, fontSize: 14, fontWeight: '800', marginBottom: 3 },
  productBtnMeta:{ color: C.muted, fontSize: 11, fontWeight: '600' },
  productPlaceholder: { flex: 1, color: C.muted, fontSize: 14 },
  qtyRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  qtyBtn:       { width: 42, height: 42, borderRadius: 11, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.primary + '30' },
  qtyInput:     { width: 70, height: 42, backgroundColor: '#F8FAFC', borderRadius: 11, borderWidth: 1.5, borderColor: C.border, textAlign: 'center', fontSize: 18, fontWeight: '900', color: C.text },
  fullBtn:      { flex: 1, backgroundColor: '#F0F4FF', borderRadius: 11, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: C.info + '40' },
  fullBtnTxt:   { color: C.info, fontSize: 12, fontWeight: '700' },
  qtyHint:      { color: C.muted, fontSize: 11, marginBottom: 18 },
  chipWrap:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: C.border, backgroundColor: '#F8FAFC' },
  chipTxt:      { color: C.textSub, fontSize: 12, fontWeight: '700' },
  selectedHint: { color: C.primary, fontSize: 11, fontWeight: '700', marginBottom: 10 },
  reasonInput:  { backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1.5, borderColor: C.border, padding: 13, fontSize: 14, color: C.text, minHeight: 70, marginBottom: 18 },
  photoBtn:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: C.border, borderStyle: 'dashed', marginBottom: 22 },
  photoTxt:     { flex: 1, color: C.primary, fontSize: 13, fontWeight: '700' },
  photoPreviewWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F8FAFC', borderRadius: 14, padding: 12, borderWidth: 1.5, borderColor: C.success + '40', marginBottom: 22 },
  photoPreview: { width: 56, height: 56, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  photoSize:    { color: C.muted, fontSize: 11, marginTop: 2 },
  btnRow:       { flexDirection: 'row', gap: 12 },
  cancelBtn:    { flex: 1, backgroundColor: '#F5F7FA', borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: C.border },
  cancelTxt:    { color: C.textSub, fontWeight: '700', fontSize: 14 },
  submitBtn:    { flex: 2, backgroundColor: C.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  submitTxt:    { color: '#FFF', fontWeight: '800', fontSize: 15 },
});

// ─── Success Toast ────────────────────────────────────────────────────────────
function SuccessToast({ mrId, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Pressable style={st.wrap} onPress={onDismiss}>
      <Icon name="check-circle" size={22} color={C.success} />
      <View style={{ flex: 1 }}>
        <Text style={st.ttl}>Return request submitted successfully</Text>
        <Text style={st.sub}>
          {mrId ? `Docket #${mrId} · ` : ''}Your request has been sent for admin review.
        </Text>
      </View>
      <Icon name="close" size={15} color={C.success} />
    </Pressable>
  );
}

const st = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.successLight, borderRadius: 14, padding: 14, marginHorizontal: 14, marginBottom: 4, borderWidth: 1, borderColor: C.success + '40', ...shadow },
  ttl:  { color: C.success, fontSize: 13, fontWeight: '800', marginBottom: 2 },
  sub:  { color: C.success, fontSize: 11, opacity: 0.8, lineHeight: 16 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ReturnsPage({ onBack }) {
  const [returns,      setReturns]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [error,        setError]        = useState(null);
  const [filter,       setFilter]       = useState('');
  const [showForm,     setShowForm]     = useState(false);
  const [detailItem,   setDetailItem]   = useState(null);
  const [toast,        setToast]        = useState(null);   // { mrId }
  const [notifBanner,  setNotifBanner]  = useState(null);   // latest unread notif
  const pollRef = useRef(null);

  // ── Fetch return history ──────────────────────────────────────────────────
  const fetchReturns = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      const params = {};
      if (filter) params.stage = filter;
      const res = await apiService.get('/returns', params);
      const list = Array.isArray(res?.data) ? res.data : [];
      setReturns(list.map(normalizeReturn));
    } catch (err) {
      console.error('[Returns] fetchReturns error:', err?.message || err);
      setError(err?.message || 'Could not load returns. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  // ── Fetch notifications (poll every 30 s to catch admin actions) ──────────
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await apiService.get('/returns/notifications');
      const list = Array.isArray(res?.data) ? res.data : [];
      // Show banner for the first unread return notification
      const unread = list.find(
        n => !n.read && (n.type === 'return_approved' || n.type === 'return_rejected')
      );
      if (unread) setNotifBanner(unread);
    } catch { /* silent — notifications are best-effort */ }
  }, []);

  const markNotifRead = async notif => {
    setNotifBanner(null);
    try {
      await apiService.put(`/returns/notifications/${notif._id}/read`);
      // Refresh list so status badges update after admin action
      fetchReturns(true);
    } catch { /* silent */ }
  };

  // ── Mount effects ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  useEffect(() => {
    fetchNotifications();
    pollRef.current = setInterval(fetchNotifications, 30000);
    return () => clearInterval(pollRef.current);
  }, [fetchNotifications]);

  // ── Submission callback ────────────────────────────────────────────────────
  // Optimistically insert the new return at the top of the list immediately,
  // so the card shows correctly right away — then silently re-sync with server.
  const handleSubmitted = (data, formPayload) => {
    const optimistic = normalizeReturn({
      ...data,
      // Preserve form fields that the backend response might not echo back
      orderNo:     data?.orderNo || formPayload?.orderId || '—',
      productName: data?.productName || formPayload?.productName || '—',
      returnQty:   data?.returnQty  ?? formPayload?.returnQty ?? '—',
      reason:      data?.reason     || formPayload?.reason    || '—',
      _id:         data?._id || data?.mrId || `temp_${Date.now()}`,
      createdAt:   data?.createdAt || new Date().toISOString(),
    });
    setReturns(prev => [optimistic, ...prev]);
    setToast({ mrId: optimistic.mrId });
    // Re-sync with server in background to replace optimistic entry with real data
    fetchReturns(true);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={ps.screen}>

      {/* ── Navbar ── */}
      <View style={ps.nav}>
        <Pressable style={ps.navBtn} onPress={onBack}>
          <Icon name="arrow-left" size={22} color="#FFF" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={ps.navTitle}>Returns</Text>
          <Text style={ps.navSub}>
            {loading ? 'Loading…' : `${returns.length} request${returns.length !== 1 ? 's' : ''}`}
          </Text>
        </View>
        <Pressable style={ps.navBtn} onPress={() => fetchReturns(true)}>
          <Icon name="refresh" size={20} color="#FFF" />
        </Pressable>
        <Pressable
          style={[ps.navBtn, { marginLeft: 8, backgroundColor: 'rgba(255,255,255,0.28)' }]}
          onPress={() => setShowForm(true)}>
          <Icon name="plus" size={22} color="#FFF" />
        </Pressable>
      </View>

      {/* ── Notification banner (approve / reject from admin) ── */}
      {notifBanner && (
        <NotifBanner notif={notifBanner} onDismiss={() => markNotifRead(notifBanner)} />
      )}

      {/* ── Success toast after submission ── */}
      {toast && (
        <SuccessToast mrId={toast.mrId} onDismiss={() => setToast(null)} />
      )}

      {/* ── Status filter pills ── */}
      <View style={ps.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={ps.filterScroll}>
          {HISTORY_FILTERS.map(f => (
            <Pressable
              key={f.value}
              onPress={() => setFilter(f.value)}
              style={[ps.pill, filter === f.value && ps.pillActive]}>
              <Text style={[ps.pillTxt, filter === f.value && ps.pillTxtActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* ── Content ── */}
      {loading ? (
        <ScrollView contentContainerStyle={ps.listBody}>
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </ScrollView>
      ) : error && returns.length === 0 ? (
        /* Full-screen error */
        <View style={ps.centerBox}>
          <Icon name="wifi-off" size={52} color={C.border} />
          <Text style={ps.errTtl}>Something went wrong</Text>
          <Text style={ps.errSub}>{error}</Text>
          <Pressable style={ps.retryBtn} onPress={() => fetchReturns(true)}>
            <Icon name="refresh" size={16} color="#FFF" />
            <Text style={ps.retryTxt}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={returns}
          keyExtractor={(item, i) => item._id || item.mrId || String(i)}
          contentContainerStyle={ps.listBody}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchReturns(true)}
              colors={[C.primary]}
              tintColor={C.primary}
            />
          }
          ListHeaderComponent={
            error ? (
              <View style={ps.errBanner}>
                <Icon name="alert-circle-outline" size={14} color={C.danger} />
                <Text style={ps.errBannerTxt}>{error}</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={ps.emptyWrap}>
              <View style={ps.emptyIconBg}>
                <Icon name="keyboard-return" size={36} color={C.primary} />
              </View>
              <Text style={ps.emptyTtl}>No return requests yet</Text>
              <Text style={ps.emptySub}>
                Only delivered order items can be returned.{'\n'}
                Tap + to raise a new return request.
              </Text>
              <Pressable style={ps.newBtn} onPress={() => setShowForm(true)}>
                <Icon name="plus-circle-outline" size={18} color="#FFF" />
                <Text style={ps.newBtnTxt}>New Return Request</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <ReturnCard item={item} onPress={setDetailItem} />
          )}
          ListFooterComponent={<View style={{ height: 32 }} />}
        />
      )}

      <NewReturnModal
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSubmitted={handleSubmitted}
      />

      {/* ── Return Detail / Timeline ── */}
      <ReturnDetailModal
        item={detailItem}
        visible={!!detailItem}
        onClose={() => setDetailItem(null)}
      />
    </View>
  );
}

// ─── Page Styles ──────────────────────────────────────────────────────────────
const ps = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: C.bg },

  // Navbar
  nav: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.primary,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 14 : 14,
    paddingBottom: 16,
  },
  navBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  navTitle: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  navSub:   { color: 'rgba(255,255,255,0.72)', fontSize: 11, marginTop: 1 },

  // Filter pills
  filterBar:    { backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  filterScroll: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  pill:         { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  pillActive:   { backgroundColor: C.primaryDark, borderColor: C.primaryDark },
  pillTxt:      { color: C.muted, fontSize: 12, fontWeight: '600' },
  pillTxtActive:{ color: '#FFF', fontSize: 12, fontWeight: '700' },

  // List
  listBody: { padding: 16, paddingBottom: 32 },

  // Full-screen error
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errTtl:    { color: C.text, fontSize: 16, fontWeight: '700', marginTop: 14, textAlign: 'center' },
  errSub:    { color: C.muted, fontSize: 13, textAlign: 'center', marginTop: 6, paddingHorizontal: 20, lineHeight: 19 },
  retryBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, marginTop: 16 },
  retryTxt:  { color: '#FFF', fontWeight: '700', fontSize: 14 },

  // Inline error banner
  errBanner:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.dangerLight, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FECACA', marginBottom: 12 },
  errBannerTxt: { color: C.danger, fontSize: 13, flex: 1 },

  // Empty state
  emptyWrap:  { alignItems: 'center', paddingVertical: 64 },
  emptyIconBg:{ width: 80, height: 80, borderRadius: 40, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTtl:   { color: C.text, fontSize: 17, fontWeight: '800' },
  emptySub:   { color: C.muted, fontSize: 13, textAlign: 'center', marginTop: 8, paddingHorizontal: 32, lineHeight: 20 },
  newBtn:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.primary, borderRadius: 14, paddingHorizontal: 22, paddingVertical: 13, marginTop: 22 },
  newBtnTxt:  { color: '#FFF', fontSize: 14, fontWeight: '800' },
});