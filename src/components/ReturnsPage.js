/**
 * ReturnsPage.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Dealer App — Returns screen
 * • Fetches from Admin's GET /api/returns (MaterialReturn model)
 * • Maps Admin table columns: MR ID, Invoice No, Product, Qty, Type (reason),
 *   Stage, Approval, Priority, Value, Date
 * • Extended fields shown only when genuinely present in API response:
 *   docketId, trackingStatus, creditNoteNo, debitNoteNo
 * • POST /api/returns confirmed → "+ Request Return" button included
 * • No Complaints tab (no backend module exists)
 * • No date-range filter (backend does not support it)
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, {useState, useEffect, useCallback} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import returnService from './services/returnService';

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
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 8,
  shadowOffset: {width: 0, height: 2},
  elevation: 3,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const dash = v => (v != null && v !== '' ? String(v) : '—');

const fmtCurrency = n => {
  const num = typeof n === 'string' ? parseFloat(n) : Number(n);
  if (n == null || n === '' || isNaN(num)) return '—';
  return `₹${num.toLocaleString('en-IN', {maximumFractionDigits: 2})}`;
};

const fmtDate = d => {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d);
    return dt.toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'});
  } catch {
    return String(d);
  }
};

// ─── Stage → human label + badge colour ──────────────────────────────────────
const stageCfg = stage => {
  const s = (stage || '').toUpperCase();
  const map = {
    REQUEST_RAISED:      {label: 'Raised',         color: C.info,    bg: C.infoLight},
    APPROVED:            {label: 'Approved',        color: C.success, bg: C.successLight},
    DOCKET_CREATED:      {label: 'Docket Created',  color: C.purple,  bg: C.purpleLight},
    VEHICLE_ASSIGNED:    {label: 'Vehicle Assigned',color: C.purple,  bg: C.purpleLight},
    OUT_FOR_PICKUP:      {label: 'Out for Pickup',  color: C.warning, bg: C.warningLight},
    PICKED_UP:           {label: 'Picked Up',       color: C.warning, bg: C.warningLight},
    IN_TRANSIT:          {label: 'In Transit',      color: C.warning, bg: C.warningLight},
    ARRIVED_AT_WAREHOUSE:{label: 'At Warehouse',    color: C.info,    bg: C.infoLight},
    RECEIVED:            {label: 'Received',        color: C.info,    bg: C.infoLight},
    QC_PENDING:          {label: 'QC Pending',      color: C.warning, bg: C.warningLight},
    QC_PASSED:           {label: 'QC Passed',       color: C.success, bg: C.successLight},
    QC_FAILED:           {label: 'QC Failed',       color: C.danger,  bg: C.dangerLight},
    INVENTORY_UPDATED:   {label: 'Inv Updated',     color: C.success, bg: C.successLight},
    FINANCE_PENDING:     {label: 'Finance Pending', color: C.warning, bg: C.warningLight},
    CLOSED:              {label: 'Closed',          color: C.success, bg: C.successLight},
  };
  return map[s] || {label: dash(stage), color: C.muted, bg: '#F3F4F6'};
};

// Approval badge colour
const approvalCfg = status => {
  const s = (status || '').toLowerCase();
  if (s === 'approved')  return {color: C.success, bg: C.successLight};
  if (s === 'rejected')  return {color: C.danger,  bg: C.dangerLight};
  return {color: C.warning, bg: C.warningLight};
};

// ─── TYPE FILTER pills ────────────────────────────────────────────────────────
// "All Types" dropdown equivalent — maps to `search` query param against reason
const TYPE_FILTERS = [
  {label: 'All',             value: ''},
  {label: 'Damaged',        value: 'Damaged'},
  {label: 'Wrong Product',  value: 'Wrong'},
  {label: 'Quality Issue',  value: 'Quality'},
  {label: 'Expired',        value: 'Expired'},
];

// ─── Skeleton Card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <View style={styles.card}>
      {/* Accent strip */}
      <View style={[styles.cardAccent, {backgroundColor: '#E2E8F0'}]} />
      <View style={{padding: 14}}>
        {/* Header row */}
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
            <View style={[styles.skel, {width: 38, height: 38, borderRadius: 10}]} />
            <View>
              <View style={[styles.skel, {width: 110, height: 13, marginBottom: 6}]} />
              <View style={[styles.skel, {width: 72, height: 10}]} />
            </View>
          </View>
          <View style={[styles.skel, {width: 70, height: 24, borderRadius: 12}]} />
        </View>
        {/* Divider */}
        <View style={[styles.skel, {width: '100%', height: 1, marginBottom: 12}]} />
        {/* Grid */}
        <View style={{flexDirection: 'row', gap: 10, marginBottom: 12}}>
          {[1, 2].map(i => (
            <View key={i} style={{flex: 1, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10}}>
              <View style={[styles.skel, {width: '60%', height: 10, marginBottom: 6}]} />
              <View style={[styles.skel, {width: '80%', height: 13}]} />
            </View>
          ))}
        </View>
        <View style={{flexDirection: 'row', gap: 10}}>
          {[1, 2].map(i => (
            <View key={i} style={{flex: 1, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10}}>
              <View style={[styles.skel, {width: '60%', height: 10, marginBottom: 6}]} />
              <View style={[styles.skel, {width: '80%', height: 13}]} />
            </View>
          ))}
        </View>
        {/* Footer */}
        <View style={[styles.skel, {width: '100%', height: 1, marginVertical: 12}]} />
        <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
          <View style={[styles.skel, {width: 90, height: 13}]} />
          <View style={[styles.skel, {width: 70, height: 13}]} />
        </View>
      </View>
    </View>
  );
}

// ─── Info Chip (2-column grid cell) ──────────────────────────────────────────
function InfoChip({icon, label, value, accent}) {
  return (
    <View style={[styles.chip, accent && {borderColor: accent + '40', backgroundColor: accent + '08'}]}>
      <View style={styles.chipHeader}>
        <Icon name={icon} size={12} color={accent || C.muted} />
        <Text style={[styles.chipLabel, accent && {color: accent}]}>{label}</Text>
      </View>
      <Text style={styles.chipValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

// ─── Return Card ──────────────────────────────────────────────────────────────
function ReturnCard({item}) {
  const stage    = stageCfg(item.currentStage);
  const approval = approvalCfg(item.approvalStatus);

  // Extended fields — shown only when genuinely present
  const hasDocket    = item.docketId    && item.docketId    !== '' && item.docketId    !== 'PENDING';
  const hasTransport = item.trackingStatus && item.trackingStatus !== '';
  const hasCN        = item.creditNoteNo   && item.creditNoteNo   !== '';
  const hasDN        = item.debitNoteNo    && item.debitNoteNo    !== '';

  return (
    <View style={styles.card}>
      {/* Left accent strip — coloured by stage */}
      <View style={[styles.cardAccent, {backgroundColor: stage.color}]} />

      <View style={styles.cardBody}>
        {/* ── Card Header ────────────────────────────────── */}
        <View style={styles.cardHeader}>
          {/* Icon avatar */}
          <View style={[styles.cardAvatar, {backgroundColor: C.primaryLight}]}>
            <Icon name="keyboard-return" size={18} color={C.primary} />
          </View>

          {/* MR ID + Date */}
          <View style={{flex: 1}}>
            <Text style={styles.mrId} numberOfLines={1}>{dash(item.mrId)}</Text>
            <View style={styles.dateRow}>
              <Icon name="calendar-outline" size={11} color={C.muted} />
              <Text style={styles.dateText}>
                {fmtDate(item.returnDate || item.createdAt)}
              </Text>
            </View>
          </View>

          {/* Stage badge */}
          <View style={[styles.stageBadge, {backgroundColor: stage.bg}]}>
            <View style={[styles.stageDot, {backgroundColor: stage.color}]} />
            <Text style={[styles.stageTxt, {color: stage.color}]}>{stage.label}</Text>
          </View>
        </View>

        {/* ── Divider ────────────────────────────────────── */}
        <View style={styles.divider} />

        {/* ── Product name full-width ─────────────────────── */}
        <View style={styles.productRow}>
          <Icon name="package-variant" size={13} color={C.primary} />
          <Text style={styles.productName} numberOfLines={2}>{dash(item.productName)}</Text>
        </View>

        {/* ── Info Grid (2 columns) ───────────────────────── */}
        <View style={styles.chipGrid}>
          <InfoChip icon="file-document-outline" label="Invoice No" value={dash(item.invoiceNo)} />
          <InfoChip icon="counter"               label="Qty Returned" value={dash(item.returnQty)} />
        </View>

        {/* Approval chip — full width */}
        <View style={[styles.approvalRow, {backgroundColor: approval.bg}]}>
          <Icon name="check-circle-outline" size={14} color={approval.color} />
          <Text style={[styles.approvalLbl, {color: approval.color}]}>Approval Status</Text>
          <View style={styles.approvalSpacer} />
          <Text style={[styles.approvalVal, {color: approval.color}]}>{dash(item.approvalStatus)}</Text>
        </View>

        {/* Conditional chips */}
        {(hasDocket || hasTransport) && (
          <View style={styles.chipGrid}>
            {hasDocket    && <InfoChip icon="barcode"       label="Docket ID"  value={item.docketId}       accent={C.purple} />}
            {hasTransport && <InfoChip icon="truck-outline" label="Transport"  value={item.trackingStatus} accent={C.info}   />}
          </View>
        )}
        {(hasCN || hasDN) && (
          <View style={styles.chipGrid}>
            {hasCN && <InfoChip icon="receipt"              label="Credit Note" value={item.creditNoteNo} accent={C.success} />}
            {hasDN && <InfoChip icon="receipt-text-outline" label="Debit Note"  value={item.debitNoteNo}  accent={C.danger}  />}
          </View>
        )}

        {/* ── Footer — Value only ─────────────────────────── */}
        <View style={styles.cardFooter}>
          <View style={styles.valueWrap}>
            <Text style={styles.valueLbl}>Return Value</Text>
            <Text style={styles.valueAmt}>{fmtCurrency(item.value)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Labelled Input ───────────────────────────────────────────────────────────
function LabeledInput({label, required, ...props}) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>
        {label}{required ? <Text style={{color: C.primary}}> *</Text> : null}
      </Text>
      <TextInput
        style={[styles.input, props.multiline && {height: 80, textAlignVertical: 'top'}]}
        placeholderTextColor={C.muted}
        {...props}
      />
    </View>
  );
}

// ─── Request Return Modal ─────────────────────────────────────────────────────
function RequestReturnModal({visible, onClose, onSubmit, submitting}) {
  const INITIAL = {supplierName: '', invoiceNo: '', productName: '', returnQty: '', reason: '', value: ''};
  const [form, setForm] = useState(INITIAL);

  const set = (k, v) => setForm(prev => ({...prev, [k]: v}));

  const handleClose = () => {
    setForm(INITIAL);
    onClose();
  };

  const handleSubmit = () => {
    if (!form.supplierName.trim() || !form.invoiceNo.trim() || !form.productName.trim() || !form.returnQty.trim() || !form.reason.trim()) {
      Alert.alert('Missing Fields', 'Please fill all required fields marked with *.');
      return;
    }
    onSubmit({
      ...form,
      supplierName: form.supplierName.trim(),
      invoiceNo:    form.invoiceNo.trim(),
      productName:  form.productName.trim(),
      reason:       form.reason.trim(),
      returnQty:    Number(form.returnQty) || 0,
      value:        Number(form.value)     || 0,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          {/* Drag Handle */}
          <View style={styles.modalHandle} />

          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalIconWrap}>
              <Icon name="keyboard-return" size={20} color={C.primary} />
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.modalTitle}>New Return Request</Text>
              <Text style={styles.modalSubtitle}>Fill in the details below</Text>
            </View>
            <Pressable onPress={handleClose} style={styles.modalCloseBtn} disabled={submitting}>
              <Icon name="close" size={20} color={C.muted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Section: Party & Invoice */}
            <Text style={styles.sectionLabel}>Party & Invoice</Text>
            <LabeledInput
              label="Supplier / Party Name"
              required
              placeholder="Enter supplier or party name"
              keyboardType="default"
              value={form.supplierName}
              onChangeText={v => set('supplierName', v)}
            />
            <LabeledInput
              label="Invoice No"
              required
              placeholder="Enter invoice number"
              keyboardType="default"
              autoCapitalize="characters"
              value={form.invoiceNo}
              onChangeText={v => set('invoiceNo', v)}
            />

            {/* Section: Product */}
            <Text style={styles.sectionLabel}>Product Details</Text>
            <LabeledInput
              label="Product Name"
              required
              placeholder="Enter product name"
              keyboardType="default"
              value={form.productName}
              onChangeText={v => set('productName', v)}
            />
            <View style={{flexDirection: 'row', gap: 10}}>
              <View style={{flex: 1}}>
                <LabeledInput
                  label="Return Quantity"
                  required
                  placeholder="0"
                  keyboardType="numeric"
                  value={form.returnQty}
                  onChangeText={v => set('returnQty', v)}
                />
              </View>
              <View style={{flex: 1}}>
                <LabeledInput
                  label="Value (₹)"
                  placeholder="0.00"
                  keyboardType="numeric"
                  value={form.value}
                  onChangeText={v => set('value', v)}
                />
              </View>
            </View>

            {/* Section: Reason */}
            <Text style={styles.sectionLabel}>Reason</Text>
            <LabeledInput
              label="Reason for Return"
              required
              placeholder="Describe the reason for this return..."
              multiline
              value={form.reason}
              onChangeText={v => set('reason', v)}
            />

            {/* Action Buttons */}
            <View style={styles.modalBtns}>
              <Pressable style={styles.cancelBtn} onPress={handleClose} disabled={submitting}>
                <Text style={styles.cancelBtnTxt}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.submitBtn, submitting && {opacity: 0.75}]}
                onPress={handleSubmit}
                disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Icon name="send-outline" size={16} color="#FFF" style={{marginRight: 6}} />
                    <Text style={styles.submitBtnTxt}>Submit Request</Text>
                  </>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
function ReturnsPage({onBack}) {
  const [returns,     setReturns]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [error,       setError]       = useState(null);
  const [typeFilter,  setTypeFilter]  = useState('');   // search param
  const [showModal,   setShowModal]   = useState(false);
  const [submitting,  setSubmitting]  = useState(false);

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      const params = {};
      if (typeFilter) params.search = typeFilter;
      const res = await returnService.getReturns(params);
      if (res?.success) {
        setReturns(res.data || []);
      } else {
        setError(res?.message || 'Failed to load returns');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [typeFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Submit new return ───────────────────────────────────────────────────────
  const handleSubmitReturn = async formData => {
    try {
      setSubmitting(true);
      const res = await returnService.createReturn(formData);
      if (res?.success) {
        setShowModal(false);
        Alert.alert('Success', 'Return request submitted successfully.');
        fetchData(true);
      } else {
        Alert.alert('Error', res?.message || 'Failed to submit return request.');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to submit return request.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.screen}>
        <Header onBack={onBack} count={0} onRefresh={() => {}} onAdd={() => setShowModal(true)} />
        <ScrollView contentContainerStyle={{padding: 16}}>
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </ScrollView>
      </View>
    );
  }

  // ── Full error (no data) ────────────────────────────────────────────────────
  if (error && returns.length === 0) {
    return (
      <View style={styles.screen}>
        <Header onBack={onBack} count={0} onRefresh={() => fetchData(true)} onAdd={() => setShowModal(true)} />
        <View style={styles.centerBox}>
          <Icon name="wifi-off" size={52} color={C.border} />
          <Text style={styles.errTitle}>Something went wrong</Text>
          <Text style={styles.errSub}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => fetchData(true)}>
            <Icon name="refresh" size={16} color="#FFF" />
            <Text style={styles.retryTxt}>Retry</Text>
          </Pressable>
        </View>
        <RequestReturnModal
          visible={showModal}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmitReturn}
          submitting={submitting}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Header
        onBack={onBack}
        count={returns.length}
        onRefresh={() => fetchData(true)}
        onAdd={() => setShowModal(true)}
      />

      <FlatList
        data={returns}
        keyExtractor={(item, idx) => item._id || item.mrId || String(idx)}
        contentContainerStyle={styles.listBody}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
            colors={[C.primary]}
            tintColor={C.primary}
          />
        }
        ListHeaderComponent={
          <>
            {/* Type / Search filter pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillsRow}
              style={{marginBottom: 14}}>
              {TYPE_FILTERS.map(f => (
                <Pressable
                  key={f.value}
                  onPress={() => setTypeFilter(f.value)}
                  style={[styles.pill, typeFilter === f.value && styles.pillActive]}>
                  <Text style={[styles.pillTxt, typeFilter === f.value && styles.pillTxtActive]}>
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            {error ? (
              <View style={styles.errCard}>
                <Icon name="alert-circle-outline" size={15} color={C.danger} />
                <Text style={styles.errCardTxt}>{error}</Text>
              </View>
            ) : null}
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Icon name="keyboard-return" size={52} color={C.border} />
            <Text style={styles.emptyTitle}>No return requests found</Text>
            <Text style={styles.emptySub}>
              Return requests raised by Admin will appear here.
              {'\n'}Tap + to raise a new request.
            </Text>
          </View>
        }
        renderItem={({item}) => <ReturnCard item={item} />}
        ListFooterComponent={<View style={{height: 32}} />}
      />

      <RequestReturnModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmitReturn}
        submitting={submitting}
      />
    </View>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function Header({onBack, count, onRefresh, onAdd}) {
  return (
    <View style={styles.header}>
      <Pressable style={styles.headerBtn} onPress={onBack}>
        <Icon name="arrow-left" size={22} color="#FFF" />
      </Pressable>
      <View style={{flex: 1}}>
        <Text style={styles.headerTitle}>Returns</Text>
        <Text style={styles.headerSub}>{count} request{count !== 1 ? 's' : ''}</Text>
      </View>
      <Pressable style={styles.headerBtn} onPress={onRefresh}>
        <Icon name="refresh" size={20} color="#FFF" />
      </Pressable>
      <Pressable style={[styles.headerBtn, {marginLeft: 8, backgroundColor: 'rgba(255,255,255,0.25)'}]} onPress={onAdd}>
        <Icon name="plus" size={22} color="#FFF" />
      </Pressable>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen:   {flex: 1, backgroundColor: C.bg},
  listBody: {padding: 16, paddingBottom: 32},
  centerBox:{flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32},

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.primary,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, gap: 10,
  },
  headerBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {color: '#FFF', fontSize: 18, fontWeight: '800'},
  headerSub:   {color: 'rgba(255,255,255,0.72)', fontSize: 12, marginTop: 1},

  pillsRow: {flexDirection: 'row', gap: 8, paddingVertical: 2},
  pill: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border,
  },
  pillActive:   {backgroundColor: C.primaryDark, borderColor: C.primaryDark},
  pillTxt:      {color: C.muted, fontSize: 12, fontWeight: '600'},
  pillTxtActive:{color: '#FFF', fontSize: 12, fontWeight: '700'},

  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 14,
    overflow: 'hidden',
    ...shadow,
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  cardBody: {
    padding: 16,
    paddingLeft: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  cardAvatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mrId: {
    color: C.text,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  dateText: {
    color: C.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  stageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  stageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stageTxt: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginBottom: 12,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FAFBFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F3F5',
  },
  productName: {
    flex: 1,
    color: C.text,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  chipGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  chip: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  chipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 5,
  },
  chipLabel: {
    color: C.muted,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  chipValue: {
    color: C.text,
    fontSize: 13,
    fontWeight: '800',
  },
  approvalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  approvalLbl: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  approvalSpacer: {
    flex: 1,
  },
  approvalVal: {
    fontSize: 12,
    fontWeight: '800',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F3F5',
  },
  valueWrap: {
    flex: 1,
  },
  valueLbl: {
    color: C.muted,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  valueAmt: {
    color: C.primary,
    fontSize: 17,
    fontWeight: '900',
  },
  stageFooterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  stageFooterTxt: {
    fontSize: 11,
    fontWeight: '700',
  },

  skel: {backgroundColor: '#E2E8F0', borderRadius: 6},

  errCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.dangerLight, borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: '#FECACA', marginBottom: 12,
  },
  errCardTxt: {color: C.danger, fontSize: 13, flex: 1},

  emptyWrap:  {alignItems: 'center', paddingVertical: 60},
  emptyTitle: {color: C.text, fontSize: 16, fontWeight: '700', marginTop: 14},
  emptySub:   {color: C.muted, fontSize: 13, textAlign: 'center', marginTop: 6,
               paddingHorizontal: 24, lineHeight: 20},

  errTitle: {color: C.text, fontSize: 16, fontWeight: '700', marginTop: 14, textAlign: 'center'},
  errSub:   {color: C.muted, fontSize: 13, textAlign: 'center', marginTop: 6,
             paddingHorizontal: 20, lineHeight: 19},
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.primary, borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 10, marginTop: 16,
  },
  retryTxt: {color: '#FFF', fontWeight: '700', fontSize: 14},

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: C.card,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20, paddingBottom: 36,
    maxHeight: '92%',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: 'center', marginBottom: 18,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, marginBottom: 20,
  },
  modalIconWrap: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  modalCloseBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  modalTitle:    {color: C.text,  fontSize: 17, fontWeight: '900'},
  modalSubtitle: {color: C.muted, fontSize: 12, marginTop: 1},

  sectionLabel: {
    color: C.primary, fontSize: 11, fontWeight: '800',
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginBottom: 10, marginTop: 4,
  },
  inputWrap:  {marginBottom: 12},
  inputLabel: {color: C.textSub, fontSize: 12, fontWeight: '600', marginBottom: 5},
  input: {
    backgroundColor: '#F8FAFC', borderRadius: 12,
    paddingHorizontal: 13, paddingVertical: 12,
    fontSize: 14, color: C.text,
    borderWidth: 1.5, borderColor: C.border,
  },
  modalBtns:    {flexDirection: 'row', gap: 12, marginTop: 20},
  cancelBtn:    {
    flex: 1, backgroundColor: '#F5F7FA', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: C.border,
  },
  cancelBtnTxt: {color: C.textSub, fontWeight: '700', fontSize: 15},
  submitBtn:    {
    flex: 2, backgroundColor: C.primary, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center',
  },
  submitBtnTxt: {color: '#FFF', fontWeight: '800', fontSize: 15},
});

export default ReturnsPage;
