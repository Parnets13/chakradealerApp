/**
 * PlaceOrderPage.js — Complete order detail view with Place Order action
 * - Shows ALL order data in proper sections (step by step)
 * - Card has only Download PDF button
 * - Place Order button is outside the card at the bottom
 */
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator, Alert, Pressable, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import apiService from './services/apiService';

const C = {
  red: '#C51F2B', redBg: '#FFF5F5',
  bg: '#F2F0EC', white: '#FFFFFF',
  text: '#1A1A1A', sub: '#555', muted: '#888', line: '#EFEDE7',
  green: '#1A7A3C', greenBg: '#E4F5EC',
  amber: '#B86A00', amberBg: '#FEF3E2',
  blue: '#1565C0', blueBg: '#E3F0FF',
  teal: '#1A7A6E', tealBg: '#E4F5F3',
  card2: '#FAF9F6',
};
const sh = {
  shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.08, shadowRadius: 10, elevation: 4,
};

const ST_CFG = {
  'Order Placed':     { c: '#1565C0', bg: '#E3F0FF' },
  'Pending Approval': { c: '#B86A00', bg: '#FEF3E2' },
  'Approved':         { c: '#1A7A3C', bg: '#E4F5EC' },
  'Rejected':         { c: '#C51F2B', bg: '#FFF5F5' },
  'Dispatched':       { c: '#827717', bg: '#F9FBE7' },
  'In Transit':       { c: '#827717', bg: '#F9FBE7' },
  'Delivered':        { c: '#1A7A3C', bg: '#E4F5EC' },
  'Cancelled':        { c: '#C51F2B', bg: '#FFF5F5' },
};

const fmtDate = d => {
  if (!d) return null;
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return null; }
};
const numFmt = n => Number(n || 0).toLocaleString('en-IN');
const safe = v =>
  v != null && String(v).trim() && String(v) !== 'undefined' && String(v) !== 'null'
    ? String(v).trim() : null;

// ─── Section header ──────────────────────────────────────────────────────────
function SecHead({ icon, title, color = C.red }) {
  return (
    <View style={sec.head}>
      <View style={[sec.iconWrap, { backgroundColor: color + '18' }]}>
        <Icon name={icon} size={14} color={color} />
      </View>
      <Text style={[sec.title, { color }]}>{title}</Text>
    </View>
  );
}
const sec = StyleSheet.create({
  head:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 4 },
  iconWrap: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  title:    { fontSize: 11, fontWeight: '900', letterSpacing: 0.7, textTransform: 'uppercase' },
});

// ─── Info row ────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value, highlight, full }) {
  if (!safe(value)) return null;
  return (
    <View style={[ir.row, full && ir.rowFull]}>
      <View style={ir.lblWrap}>
        {icon && <Icon name={icon} size={13} color={C.muted} style={{ marginRight: 6 }} />}
        <Text style={ir.lbl}>{label}</Text>
      </View>
      <Text
        style={[ir.val, highlight && { color: C.red, fontWeight: '900', fontSize: 14 }, full && ir.valFull]}
        numberOfLines={full ? 4 : 2}
      >
        {value}
      </Text>
    </View>
  );
}
const ir = StyleSheet.create({
  row:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.line },
  rowFull: { flexDirection: 'column', gap: 4 },
  lblWrap: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  lbl:     { fontSize: 12, fontWeight: '600', color: C.muted },
  val:     { fontSize: 13, fontWeight: '700', color: C.text, maxWidth: '58%', textAlign: 'right', flexShrink: 1 },
  valFull: { maxWidth: '100%', textAlign: 'left', fontSize: 12, fontWeight: '600', color: C.sub },
});

// ─── Chip tag ────────────────────────────────────────────────────────────────
function Chip({ icon, label, color = C.blue, bg }) {
  if (!label) return null;
  return (
    <View style={[ch.chip, { backgroundColor: bg || color + '18' }]}>
      {icon && <Icon name={icon} size={11} color={color} />}
      <Text style={[ch.txt, { color }]}>{label}</Text>
    </View>
  );
}
const ch = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  txt:  { fontSize: 11, fontWeight: '800' },
});

// ─── Main ────────────────────────────────────────────────────────────────────
export default function PlaceOrderPage({ onBack, initialOrder, onOrderPlaced }) {
  const [placing, setPlacing] = useState(false);
  const [placed,  setPlaced]  = useState(false);
  const [order,   setOrder]   = useState(initialOrder || null);
  const [loading, setLoading] = useState(false);

  // Sync — same order: merge only; new order: full reset
  useEffect(() => {
    if (!initialOrder) return;
    const newId = initialOrder?.mongodbId || initialOrder?._id || initialOrder?.orderId || initialOrder?.id;
    const curId = order?.mongodbId || order?._id || order?.orderId || order?.id;
    if (newId && newId === curId) {
      setOrder(prev => ({ ...prev, ...initialOrder }));
    } else {
      setOrder(initialOrder);
      setPlaced(false);
    }
  }, [initialOrder]);

  // Fetch full order from API if lineItems are missing
  useEffect(() => {
    const id = initialOrder?.mongodbId || initialOrder?._id || initialOrder?.orderId || initialOrder?.id;
    if (!id) return;
    const items = initialOrder?.lineItems || initialOrder?.items || [];
    const hasItems = items.length > 0 && (items[0]?.name || items[0]?.itemName);
    if (hasItems) return;
    setLoading(true);
    apiService.get(`/orders/${id}`)
      .then(res => { if (res?.success && res?.data) setOrder({ ...initialOrder, ...res.data }); })
      .catch(err => console.warn('Order fetch:', err?.message))
      .finally(() => setLoading(false));
  }, [initialOrder]);

  // ── Empty ─────────────────────────────────────────────────────────────────
  if (!order) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <View style={s.navbar}>
          <Pressable onPress={onBack} style={s.backBtn}>
            <Icon name="arrow-left" size={22} color="#FFF" />
          </Pressable>
          <Text style={s.navTitle}>Place Order</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={s.empty}>
          <Icon name="clipboard-arrow-up-outline" size={64} color={C.line} />
          <Text style={s.emptyTitle}>No Order Selected</Text>
          <Text style={s.emptyText}>Go to My Orders and tap Place Order on any order card.</Text>
          <TouchableOpacity style={s.emptyBtn} onPress={onBack}>
            <Icon name="arrow-left" size={15} color="#FFF" />
            <Text style={s.emptyBtnTxt}>Back to My Orders</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <View style={s.navbar}>
          <Pressable onPress={onBack} style={s.backBtn}>
            <Icon name="arrow-left" size={22} color="#FFF" />
          </Pressable>
          <Text style={s.navTitle}>Place Order</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={[s.empty, { backgroundColor: C.bg }]}>
          <ActivityIndicator size="large" color={C.red} />
          <Text style={[s.emptyText, { marginTop: 12 }]}>Loading order details…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Resolve all fields ────────────────────────────────────────────────────
  const items      = Array.isArray(order.lineItems) && order.lineItems.length > 0
    ? order.lineItems : (order.items || []);
  const item0      = items[0] || {};

  const orderId    = safe(order.orderId || order.id) || '—';
  const status     = placed ? 'Pending Approval' : (order.status || 'Order Placed');
  const stCfg      = ST_CFG[status] || ST_CFG['Order Placed'];

  // Product
  const product    = safe(item0.name || item0.itemName || order.productName);
  const category   = safe(item0.category || order._categoryName);
  const sku        = safe(item0.sku);
  const unit       = safe(item0.packSize || item0.unit || item0.uom || order._packSize);
  const qty        = item0.quantity != null ? String(item0.quantity) : null;
  const qtyWithUnit = qty ? `${qty}${unit ? ' ' + unit : ''}` : null;

  // Pricing
  const unitPrice  = item0.unitPrice > 0 ? `₹${numFmt(item0.unitPrice)}` : null;
  const gstPct     = item0.gstPercent > 0 ? `${item0.gstPercent}%` : null;
  const discount   = item0.discount > 0 ? `${item0.discount}%` : null;
  const subTotal   = order.subTotal || 0;
  const totalGst   = order.totalGst || 0;
  const grandTotal = order.value || order.totalAmount || 0;

  // Dates
  const orderDate    = fmtDate(order.orderDate || order.createdAt);
  const deliveryDate = fmtDate(order.expectedDeliveryDate);

  // Dealer / Customer
  const dealer     = safe(order.customer || order.customerName);
  const mobile     = safe(order.mobile);
  const email      = safe(order.email);
  const company    = safe(order.company || order._vendorName);

  // Delivery
  const address    = safe(order.deliveryAddress ||
    [order.address, order.city, order.state, order.pincode].filter(Boolean).join(', '));
  const payMode    = safe(order.paymentMode);
  const priority   = safe(order.priority);
  const poNum      = safe(order.poNumber);
  const refNum     = safe(order.referenceNumber);
  const remarks    = safe(order.remarks || order.notes);

  // ── Place handler ─────────────────────────────────────────────────────────
  const handlePlace = async () => {
    if (placed) { Alert.alert('Already Placed', 'This order has already been submitted.'); return; }
    setPlacing(true);
    try {
      const id = order.mongodbId || order._id || order.orderId || order.id;
      const res = await apiService.post(`/orders/${id}/place`, {});
      if (res?.success) {
        setOrder(prev => ({ ...prev, status: 'Pending Approval' }));
        setPlaced(true);
        if (onOrderPlaced) onOrderPlaced();
      } else {
        Alert.alert('Error', res?.message || 'Could not place order. Please try again.');
      }
    } catch (err) {
      Alert.alert('Error', err?.message || 'Could not place order. Check your connection.');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      {/* Navbar */}
      <View style={s.navbar}>
        <Pressable onPress={onBack} style={s.backBtn} disabled={placing}>
          <Icon name="arrow-left" size={22} color="#FFF" />
        </Pressable>
        <Text style={s.navTitle}>Place Order</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>

        {/* Success banner */}
        {placed && (
          <View style={s.successBanner}>
            <Icon name="check-circle" size={22} color={C.green} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={s.successTitle}>Order Placed Successfully!</Text>
              <Text style={s.successSub}>Order #{orderId} is now Pending Approval</Text>
            </View>
          </View>
        )}

        {/* ══════════════════ ORDER CARD ══════════════════════════════════════ */}
        <View style={s.card}>

          {/* ① Order ID + Status */}
          <View style={s.cardTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.orderLabel}>ORDER</Text>
              <Text style={s.orderIdTxt}>#{orderId}</Text>
            </View>
            <View style={[s.statusBadge, { backgroundColor: stCfg.bg }]}>
              <View style={[s.statusDot, { backgroundColor: stCfg.c }]} />
              <Text style={[s.statusTxt, { color: stCfg.c }]}>{status}</Text>
            </View>
          </View>

          {/* Chips row — priority, payment mode */}
          <View style={s.chipsRow}>
            {priority && priority !== 'Normal' && (
              <Chip icon={priority === 'Urgent' ? 'flag' : 'flag-outline'}
                label={priority}
                color={priority === 'Urgent' ? C.red : C.amber}
                bg={priority === 'Urgent' ? C.redBg : C.amberBg} />
            )}
            {payMode && <Chip icon="credit-card-outline" label={payMode} color={C.teal} bg={C.tealBg} />}
            {company && <Chip icon="office-building-outline" label={company} color={C.blue} bg={C.blueBg} />}
          </View>

          <View style={s.divider} />

          {/* ② Product Section */}
          <SecHead icon="package-variant-closed" title="Product Details" />
          <View style={s.section}>
            <InfoRow icon="tag-outline"        label="Product"    value={product}    highlight />
            <InfoRow icon="shape-outline"      label="Category"   value={category} />
            <InfoRow icon="barcode"            label="SKU"        value={sku} />
            <InfoRow icon="counter"            label="Quantity"   value={qtyWithUnit} />
            <InfoRow icon="package-up"         label="Pack Size"  value={unit} />
          </View>

          <View style={s.divider} />

          {/* ③ Pricing Section */}
          <SecHead icon="currency-inr" title="Pricing" color={C.green} />
          <View style={s.section}>
            <InfoRow icon="currency-inr"       label="Unit Price" value={unitPrice} />
            <InfoRow icon="sale"               label="Discount"   value={discount} />
            <InfoRow icon="percent-outline"    label="GST"        value={gstPct} />
          </View>
          {/* Price summary strip */}
          {grandTotal > 0 && (
            <View style={s.priceSummary}>
              {subTotal > 0 && (
                <View style={s.priceCol}>
                  <Text style={s.priceLbl}>Sub Total</Text>
                  <Text style={s.priceVal}>₹{numFmt(subTotal)}</Text>
                </View>
              )}
              {totalGst > 0 && (
                <View style={s.priceCol}>
                  <Text style={s.priceLbl}>GST</Text>
                  <Text style={s.priceVal}>₹{numFmt(totalGst)}</Text>
                </View>
              )}
              <View style={[s.priceCol, s.priceColLast]}>
                <Text style={[s.priceLbl, { color: C.red }]}>Grand Total</Text>
                <Text style={[s.priceVal, { color: C.red, fontSize: 18, fontWeight: '900' }]}>₹{numFmt(grandTotal)}</Text>
              </View>
            </View>
          )}

          <View style={s.divider} />

          {/* ④ Dealer / Customer */}
          {(dealer || mobile || email) && <>
            <SecHead icon="store-outline" title="Dealer Info" color={C.blue} />
            <View style={s.section}>
              <InfoRow icon="store-outline"    label="Dealer"  value={dealer} />
              <InfoRow icon="phone-outline"    label="Mobile"  value={mobile} />
              <InfoRow icon="email-outline"    label="Email"   value={email} />
            </View>
            <View style={s.divider} />
          </>}

          {/* ⑤ Dates */}
          <SecHead icon="calendar-outline" title="Dates" color={C.amber} />
          <View style={s.section}>
            <InfoRow icon="calendar-blank-outline" label="Order Date"    value={orderDate} />
            <InfoRow icon="calendar-check"         label="Delivery Date" value={deliveryDate} />
          </View>

          <View style={s.divider} />

          {/* ⑥ Delivery */}
          <SecHead icon="map-marker-outline" title="Delivery" color={C.teal} />
          <View style={s.section}>
            <InfoRow icon="map-marker-outline" label="Address"    value={address} full />
          </View>

          {/* ⑦ Reference */}
          {(poNum || refNum) && <>
            <View style={s.divider} />
            <SecHead icon="pound-box-outline" title="Reference" color={C.blue} />
            <View style={s.section}>
              <InfoRow icon="pound-box-outline"  label="PO Number"  value={poNum} />
              <InfoRow icon="link-variant"       label="Reference"  value={refNum} />
            </View>
          </>}

          {/* ⑧ Remarks */}
          {remarks && <>
            <View style={s.divider} />
            <SecHead icon="note-text-outline" title="Remarks / Notes" color={C.muted} />
            <View style={s.section}>
              <View style={s.remarksBox}>
                <Text style={s.remarksTxt}>{remarks}</Text>
              </View>
            </View>
          </>}

          <View style={s.divider} />

          {/* ⑨ PDF Download — only button inside card */}
          <TouchableOpacity
            style={s.pdfBtn}
            onPress={() => Alert.alert('Download PDF', `PDF for Order #${orderId} will be saved to your device.`)}
          >
            <Icon name="file-pdf-box" size={18} color={C.white} />
            <Text style={s.pdfTxt}>Download PDF</Text>
          </TouchableOpacity>

        </View>
        {/* ══════════════════════════════════════════════════════════════════ */}

        {/* ⑩ Place Order — OUTSIDE card */}
        <View style={s.outerBtnWrap}>
          {!placed ? (
            <TouchableOpacity
              style={[s.placeBtn, placing && s.placeBtnDim]}
              onPress={handlePlace}
              disabled={placing}
            >
              {placing
                ? <ActivityIndicator color="#FFF" size="small" />
                : <>
                    <Icon name="send-circle-outline" size={20} color="#FFF" />
                    <Text style={s.placeTxt}>Place Order</Text>
                  </>
              }
            </TouchableOpacity>
          ) : (
            <View style={s.placedChip}>
              <Icon name="check-circle" size={18} color={C.green} />
              <Text style={s.placedTxt}>Order Placed — Pending Approval</Text>
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: C.red },
  navbar:   { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 12 },
  backBtn:  { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  navTitle: { flex: 1, fontSize: 17, fontWeight: '900', color: '#FFF', letterSpacing: 0.3 },

  body: { padding: 12, paddingBottom: 44 },

  empty:       { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg, paddingHorizontal: 36 },
  emptyTitle:  { fontSize: 18, fontWeight: '900', color: C.text, marginTop: 16 },
  emptyText:   { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  emptyBtn:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.red, borderRadius: 12, paddingHorizontal: 22, paddingVertical: 13, marginTop: 24 },
  emptyBtnTxt: { color: '#FFF', fontSize: 14, fontWeight: '900' },

  successBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.greenBg, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#A5D6B0' },
  successTitle:  { fontSize: 14, fontWeight: '900', color: C.green },
  successSub:    { fontSize: 12, color: '#2E7D32', marginTop: 2 },

  // Card
  card:         { backgroundColor: C.white, borderRadius: 20, borderWidth: 1, borderColor: C.line, paddingVertical: 16, paddingHorizontal: 16, ...sh },
  cardTopRow:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  orderLabel:   { fontSize: 10, fontWeight: '700', color: C.muted, letterSpacing: 1 },
  orderIdTxt:   { fontSize: 20, fontWeight: '900', color: C.text, marginTop: 2 },
  statusBadge:  { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, marginLeft: 8 },
  statusDot:    { width: 7, height: 7, borderRadius: 4 },
  statusTxt:    { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  chipsRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  divider:      { height: 1, backgroundColor: C.line, marginVertical: 12 },

  // Sections
  section:      { gap: 0 },
  remarksBox:   { backgroundColor: C.card2, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: C.line },
  remarksTxt:   { fontSize: 13, color: C.sub, lineHeight: 20 },

  // Price summary
  priceSummary: { flexDirection: 'row', backgroundColor: C.card2, borderRadius: 12, marginTop: 10, marginBottom: 4, overflow: 'hidden', borderWidth: 1, borderColor: C.line },
  priceCol:     { flex: 1, alignItems: 'center', paddingVertical: 12 },
  priceColLast: { flex: 1.3, borderLeftWidth: 1, borderLeftColor: C.line },
  priceLbl:     { fontSize: 10, fontWeight: '700', color: C.muted, marginBottom: 4 },
  priceVal:     { fontSize: 14, fontWeight: '800', color: C.text },

  // PDF button inside card
  pdfBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2E7D32', borderRadius: 12, paddingVertical: 13 },
  pdfTxt:       { color: '#FFF', fontSize: 14, fontWeight: '800' },

  // Place Order outside card
  outerBtnWrap: { marginTop: 14 },
  placeBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: C.green, borderRadius: 14, paddingVertical: 16 },
  placeBtnDim:  { backgroundColor: '#B0BEC5' },
  placeTxt:     { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 0.3 },
  placedChip:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.greenBg, borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: '#A5D6B0' },
  placedTxt:    { fontSize: 13, fontWeight: '800', color: C.green },
});
