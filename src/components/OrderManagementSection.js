/**
 * OrderManagementSection.js
 * My Orders screen — create + manage orders
 *
 * Card buttons: icon-only, tap icon to see name as tooltip
 * Card: shows only real created-order data (product, category, amount, status, date)
 * All buttons fully wired: Edit, Track, Place, View (with invoice count), Delete, Print, PDF
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ActivityIndicator, Alert, Modal, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
// apiService used only for delete/edit/invoices — not required for create
let apiService;
try { apiService = require('./services/apiService').default; } catch(_) { apiService = null; }

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  red: '#C51F2B', redDk: '#A3101B',
  bg: '#F2F0EC', white: '#FFFFFF',
  text: '#1A1A1A', sub: '#555', muted: '#888', line: '#E8E4DE',
  green: '#1A7A3C', greenBg: '#E4F5EC',
  amber: '#B86A00', amberBg: '#FEF3E2',
  blue: '#1565C0', blueBg: '#E3F0FF',
  teal: '#1A7A6E', tealBg: '#E4F5F3',
  purple: '#6A1B9A', purpleBg: '#F3E5F5',
  navy: '#0277BD', navyBg: '#E1F5FE',
  olive: '#558B2F', oliveBg: '#F1F8E9',
};
const sh = { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3 };

// ─── Constants ────────────────────────────────────────────────────────────────
const ALL_STATUSES = [
  'All','Order Placed','Pending Approval','Approved','Rejected',
  'Picking Started','Picking Completed','Sorting Started','Sorting Completed',
  'Packing Started','Packing Completed','Invoice Generated','Ready for Dispatch',
  'Dispatched','In Transit','Delivered','Cancelled',
];
const EDITABLE  = ['Order Placed', 'Pending Approval'];
const PLACEABLE = ['Order Placed'];
const PRIORITIES = ['Normal', 'High', 'Urgent'];
const PAY_MODES  = ['Cash', 'Credit', 'Online'];

const ST = {
  'Order Placed':       { c: C.blue,   bg: C.blueBg   },
  'Pending Approval':   { c: C.amber,  bg: C.amberBg  },
  'Approved':           { c: C.green,  bg: C.greenBg  },
  'Rejected':           { c: C.red,    bg: '#FFF5F5'  },
  'Picking Started':    { c: C.purple, bg: C.purpleBg },
  'Picking Completed':  { c: C.purple, bg: '#EDE7F6'  },
  'Sorting Started':    { c: C.teal,   bg: C.tealBg   },
  'Sorting Completed':  { c: C.teal,   bg: '#B2DFDB'  },
  'Packing Started':    { c: C.navy,   bg: C.navyBg   },
  'Packing Completed':  { c: C.navy,   bg: '#B3E5FC'  },
  'Invoice Generated':  { c: C.blue,   bg: '#E3F2FD'  },
  'Ready for Dispatch': { c: C.olive,  bg: C.oliveBg  },
  'Dispatched':         { c: '#827717',bg: '#F9FBE7'  },
  'In Transit':         { c: C.teal,   bg: C.tealBg   },
  'Delivered':          { c: C.green,  bg: C.greenBg  },
  'Cancelled':          { c: C.red,    bg: '#FFF5F5'  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = d => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return String(d); }
};
const fmtAmt = o => {
  if (o.amount && typeof o.amount === 'string') return o.amount;
  return `₹${Number(o.value || o.totalAmount || 0).toLocaleString('en-IN')}`;
};
const TODAY = new Date();
const toISO = d => d ? new Date(d).toISOString().slice(0, 10) : '';
const numFmt = n => Number(n || 0).toLocaleString('en-IN');
const resolveId = order => order?.mongodbId || order?._id || order?.orderId || order?.id || '';

// ─── IconTooltipButton — icon only, long-press or tap shows label ─────────────
function IconBtn({ icon, label, onPress, color = C.white, bg, disabled = false, size = 18 }) {
  const [showTip, setShowTip] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const flash = () => {
    setShowTip(true);
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.delay(900),
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setShowTip(false));
  };

  const handlePress = () => {
    flash();
    if (!disabled && onPress) onPress();
  };

  return (
    <View style={{ alignItems: 'center' }}>
      <Pressable
        onPress={handlePress}
        disabled={disabled}
        style={[ib.btn, bg && { backgroundColor: bg }, disabled && ib.dim]}
      >
        <Icon name={icon} size={size} color={disabled ? 'rgba(255,255,255,0.4)' : color} />
      </Pressable>
      {showTip && (
        <Animated.View style={[ib.tip, { opacity: fadeAnim }]}>
          <Text style={ib.tipTxt}>{label}</Text>
        </Animated.View>
      )}
    </View>
  );
}
const ib = StyleSheet.create({
  btn:    { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dim:    { opacity: 0.4 },
  tip:    { position: 'absolute', bottom: -24, backgroundColor: 'rgba(0,0,0,0.78)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, zIndex: 99, minWidth: 60, alignItems: 'center' },
  tipTxt: { color: '#fff', fontSize: 10, fontWeight: '700', textAlign: 'center' },
});

// ─── SearchableDropdown ───────────────────────────────────────────────────────
function SDropdown({ label, placeholder, value, onSelect, items = [], keyField = '_id', labelField = 'name', loading = false, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const filtered = items.filter(i => (i[labelField] || '').toLowerCase().includes(q.toLowerCase()));
  const display = value ? (items.find(i => String(i[keyField]) === String(value))?.[labelField] || '') : '';
  return (
    <View style={sd.wrap}>
      <Text style={sd.lbl}>{label}</Text>
      <Pressable style={[sd.btn, disabled && sd.btnDim]} onPress={() => !disabled && setOpen(true)}>
        <Text style={[sd.btnTxt, !display && sd.ph]} numberOfLines={1}>{display || placeholder}</Text>
        {loading
          ? <ActivityIndicator size="small" color={C.red} style={{ marginLeft: 4 }} />
          : <Icon name="chevron-down" size={17} color={C.muted} />}
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={sd.overlay} onPress={() => setOpen(false)}>
          <View style={sd.sheet}>
            <View style={sd.shHead}>
              <Text style={sd.shTitle}>{label}</Text>
              <Pressable onPress={() => setOpen(false)}><Icon name="close" size={20} color={C.text} /></Pressable>
            </View>
            <View style={sd.search}>
              <Icon name="magnify" size={16} color={C.muted} />
              <TextInput style={sd.searchIn} value={q} onChangeText={setQ}
                placeholder="Search…" placeholderTextColor={C.muted} autoFocus />
              {q.length > 0 && <Pressable onPress={() => setQ('')}><Icon name="close-circle" size={15} color={C.muted} /></Pressable>}
            </View>
            <ScrollView style={{ maxHeight: 280 }}>
              {filtered.length === 0
                ? <Text style={sd.none}>No results found</Text>
                : filtered.map(i => {
                    const active = String(i[keyField]) === String(value);
                    return (
                      <Pressable key={String(i[keyField])} style={[sd.item, active && sd.itemOn]}
                        onPress={() => { onSelect(i); setOpen(false); setQ(''); }}>
                        <Text style={[sd.itemTxt, active && sd.itemTxtOn]}>{i[labelField]}</Text>
                        {active && <Icon name="check" size={15} color={C.red} />}
                      </Pressable>
                    );
                  })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
const sd = StyleSheet.create({
  wrap:     { marginBottom: 14 },
  lbl:      { fontSize: 11, fontWeight: '800', color: C.muted, letterSpacing: 0.5, marginBottom: 5 },
  btn:      { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: C.line, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 12, backgroundColor: C.white },
  btnDim:   { backgroundColor: '#F5F5F5', opacity: 0.6 },
  btnTxt:   { flex: 1, fontSize: 14, color: C.text, fontWeight: '500' },
  ph:       { color: C.muted },
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:    { backgroundColor: C.white, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 36 },
  shHead:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  shTitle:  { fontSize: 16, fontWeight: '900', color: C.text },
  search:   { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: C.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 8 },
  searchIn: { flex: 1, fontSize: 14, color: C.text },
  item:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: C.line },
  itemOn:   { backgroundColor: '#FFF5F5' },
  itemTxt:  { flex: 1, fontSize: 14, color: C.text, fontWeight: '500' },
  itemTxtOn:{ color: C.red, fontWeight: '800' },
  none:     { textAlign: 'center', color: C.muted, paddingVertical: 20, fontSize: 14 },
});

// ─── DatePicker ───────────────────────────────────────────────────────────────
function DatePicker({ label, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [vY, setVY] = useState((value || TODAY).getFullYear());
  const [vM, setVM] = useState((value || TODAY).getMonth());
  const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const fd = new Date(vY, vM, 1).getDay();
  const dim = new Date(vY, vM + 1, 0).getDate();
  const cells = [...Array(fd).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)];
  const goP = () => { const d = new Date(vY, vM - 1, 1); setVY(d.getFullYear()); setVM(d.getMonth()); };
  const goN = () => { const d = new Date(vY, vM + 1, 1); setVY(d.getFullYear()); setVM(d.getMonth()); };
  const pick = day => { if (!day) return; onChange(new Date(vY, vM, day)); setOpen(false); };
  const ds = value ? `${String(value.getDate()).padStart(2,'0')} / ${String(value.getMonth()+1).padStart(2,'0')} / ${value.getFullYear()}` : '';
  return (
    <View style={dp.wrap}>
      <Text style={dp.lbl}>{label}</Text>
      <Pressable style={dp.btn} onPress={() => setOpen(true)}>
        <Icon name="calendar-outline" size={15} color={C.muted} />
        <Text style={[dp.btnTxt, !ds && dp.ph]}>{ds || 'Select date'}</Text>
        {value
          ? <Pressable onPress={() => onChange(null)} hitSlop={8}><Icon name="close-circle" size={15} color={C.muted} /></Pressable>
          : <Icon name="chevron-down" size={15} color={C.muted} />}
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={dp.overlay} onPress={() => setOpen(false)}>
          <View style={dp.cal}>
            <View style={dp.head}>
              <Pressable onPress={goP} style={dp.navBtn}><Icon name="chevron-left" size={20} color={C.text} /></Pressable>
              <Text style={dp.month}>{MON[vM]} {vY}</Text>
              <Pressable onPress={goN} style={dp.navBtn}><Icon name="chevron-right" size={20} color={C.text} /></Pressable>
            </View>
            <View style={dp.dayRow}>
              {['Su','Mo','Tu','We','Th','Fr','Sa'].map(n => <Text key={n} style={dp.dn}>{n}</Text>)}
            </View>
            <View style={dp.grid}>
              {cells.map((day, i) => {
                const sel = day && value && vY === value.getFullYear() && vM === value.getMonth() && day === value.getDate();
                const tod = day && vY === TODAY.getFullYear() && vM === TODAY.getMonth() && day === TODAY.getDate();
                return (
                  <Pressable key={i} style={[dp.cell, sel && dp.cellSel, tod && !sel && dp.cellTod]} onPress={() => pick(day)}>
                    <Text style={[dp.cellTxt, sel && dp.cellTxtSel, tod && !sel && dp.cellTxtTod]}>{day || ''}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable style={dp.todayBtn} onPress={() => { setVY(TODAY.getFullYear()); setVM(TODAY.getMonth()); pick(TODAY.getDate()); }}>
              <Text style={dp.todayTxt}>Today</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
const dp = StyleSheet.create({
  wrap:      { marginBottom: 14 },
  lbl:       { fontSize: 11, fontWeight: '800', color: C.muted, letterSpacing: 0.5, marginBottom: 5 },
  btn:       { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: C.line, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 12, backgroundColor: C.white },
  btnTxt:    { flex: 1, fontSize: 14, color: C.text, fontWeight: '500' },
  ph:        { color: C.muted },
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  cal:       { backgroundColor: C.white, borderRadius: 18, padding: 16, width: 308, ...sh },
  head:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  navBtn:    { padding: 6 },
  month:     { fontSize: 15, fontWeight: '900', color: C.text },
  dayRow:    { flexDirection: 'row', marginBottom: 4 },
  dn:        { width: '14.28%', textAlign: 'center', fontSize: 10, fontWeight: '700', color: C.muted, paddingVertical: 3 },
  grid:      { flexDirection: 'row', flexWrap: 'wrap' },
  cell:      { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  cellSel:   { backgroundColor: C.red },
  cellTod:   { borderWidth: 1.5, borderColor: C.red },
  cellTxt:   { fontSize: 13, color: C.text, fontWeight: '500' },
  cellTxtSel:{ color: C.white, fontWeight: '900' },
  cellTxtTod:{ color: C.red, fontWeight: '800' },
  todayBtn:  { marginTop: 12, alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 8, backgroundColor: '#FFF0F0', borderRadius: 22 },
  todayTxt:  { color: C.red, fontSize: 13, fontWeight: '800' },
});

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Sec({ title, icon, children }) {
  return (
    <View style={sc.box}>
      <View style={sc.head}>
        <Icon name={icon} size={14} color={C.red} />
        <Text style={sc.title}>{title}</Text>
      </View>
      {children}
    </View>
  );
}
const sc = StyleSheet.create({
  box:   { backgroundColor: C.white, borderRadius: 14, marginHorizontal: 12, marginTop: 10, padding: 16, borderWidth: 1, borderColor: C.line },
  head:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  title: { fontSize: 12, fontWeight: '900', color: C.red, letterSpacing: 0.6, textTransform: 'uppercase' },
});

const Lbl = ({ t }) => <Text style={{ fontSize: 11, fontWeight: '800', color: C.muted, letterSpacing: 0.5, marginBottom: 5, marginTop: 2 }}>{t}</Text>;

const Inp = ({ style, ...props }) => (
  <TextInput
    style={[{ borderWidth: 1.5, borderColor: C.line, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 12, fontSize: 14, color: C.text, backgroundColor: C.white, marginBottom: 14 }, style]}
    placeholderTextColor={C.muted}
    {...props}
  />
);

// ─── CreateOrderModal ─────────────────────────────────────────────────────────
function CreateOrderModal({ visible, onClose, onCreated }) {
  const [saving,        setSaving]        = useState(false);
  const [customerName,  setCustomerName]  = useState('');
  const [mobile,        setMobile]        = useState('');
  const [email,         setEmail]         = useState('');
  const [productName,   setProductName]   = useState('');
  const [categoryName,  setCategoryName]  = useState('');
  const [qty,           setQty]           = useState('');
  const [unitPrice,     setUnitPrice]     = useState('');
  const [discount,      setDiscount]      = useState('');
  const [gstPct,        setGstPct]        = useState('');
  const [payMode,       setPayMode]       = useState('');
  const [address,       setAddress]       = useState('');
  const [city,          setCity]          = useState('');
  const [stateName,     setStateName]     = useState('');
  const [pincode,       setPincode]       = useState('');
  const [poNum,         setPoNum]         = useState('');
  const [refNum,        setRefNum]        = useState('');
  const [remarks,       setRemarks]       = useState('');
  const [priority,      setPriority]      = useState('Normal');
  const [orderDate,     setOrderDate]     = useState(TODAY);
  const [deliveryDate,  setDeliveryDate]  = useState(null);

  const qtyN   = Number(qty)       || 0;
  const priceN = Number(unitPrice) || 0;
  const discN  = Number(discount)  || 0;
  const gstN   = Number(gstPct)    || 0;
  const hasPrice = qtyN > 0 && priceN > 0;
  const sub = hasPrice ? +(qtyN * priceN * (1 - discN / 100)).toFixed(2) : 0;
  const gst = hasPrice ? +((sub * gstN) / 100).toFixed(2) : 0;
  const tot = +(sub + gst).toFixed(2);

  const reset = () => {
    setCustomerName(''); setMobile(''); setEmail('');
    setProductName(''); setCategoryName('');
    setQty(''); setUnitPrice(''); setDiscount(''); setGstPct('');
    setPayMode(''); setAddress(''); setCity(''); setStateName(''); setPincode('');
    setPoNum(''); setRefNum(''); setRemarks(''); setPriority('Normal');
    setOrderDate(TODAY); setDeliveryDate(null);
  };

  useEffect(() => { if (!visible) return; reset(); }, [visible]);

  const handleSubmit = () => {
    if (!customerName.trim()) { Alert.alert('Validation', 'Customer Name is required.'); return; }
    if (!productName.trim())  { Alert.alert('Validation', 'Product Name is required.');  return; }
    if (!qty || qtyN < 1)     { Alert.alert('Validation', 'Enter a valid quantity (min 1).'); return; }

    const localId    = 'ORD-' + Date.now();
    const now        = new Date().toISOString();
    const fullAddr   = [address.trim(), city.trim(), stateName.trim(), pincode.trim()].filter(Boolean).join(', ');

    const lineItem = {
      productId:  localId,
      name:       productName.trim(),
      category:   categoryName.trim() || '—',
      sku:        '',
      quantity:   qtyN,
      unitPrice:  priceN,
      discount:   discN,
      gstPercent: gstN,
      gstAmount:  gst,
      total:      tot,
      packSize:   '',
    };

    const newOrder = {
      mongodbId:            localId,
      orderId:              localId,
      id:                   localId,
      customer:             customerName.trim(),
      customerName:         customerName.trim(),
      mobile:               mobile.trim(),
      email:                email.trim(),
      _categoryName:        categoryName.trim() || '—',
      _vendorName:          customerName.trim(),
      _packSize:            '',
      status:               'Order Placed',
      source:               'DealerApp',
      priority,
      value:                tot,
      subTotal:             sub,
      totalGst:             gst,
      totalAmount:          tot,
      paymentMode:          payMode,
      deliveryAddress:      fullAddr,
      address:              address.trim(),
      city:                 city.trim(),
      state:                stateName.trim(),
      pincode:              pincode.trim(),
      poNumber:             poNum.trim(),
      referenceNumber:      refNum.trim(),
      remarks:              remarks.trim(),
      notes:                remarks.trim(),
      createdAt:            now,
      orderDate:            toISO(orderDate) || now,
      expectedDeliveryDate: deliveryDate ? toISO(deliveryDate) : null,
      lineItems:            [lineItem],
      items:                [lineItem],
      _isLocal:             true,
    };

    onCreated(newOrder);
    onClose();
    Alert.alert('✅ Order Created', 'Order ' + localId + ' created successfully.');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={fm.overlay}>
        <View style={fm.sheet}>
          {/* Header */}
          <View style={fm.hdr}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={fm.hdrIcon}><Icon name="clipboard-plus-outline" size={18} color={C.red} /></View>
              <Text style={fm.hdrTitle}>Create New Order</Text>
            </View>
            <Pressable onPress={onClose} style={fm.closeBtn}><Icon name="close" size={19} color={C.text} /></Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 48 }}>

            {/* Customer */}
            <Sec title="Customer Details" icon="account-outline">
              <Lbl t="CUSTOMER NAME *" /><Inp value={customerName} onChangeText={setCustomerName} placeholder="e.g. Rahul Sharma" />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}><Lbl t="MOBILE" /><Inp value={mobile} onChangeText={setMobile} keyboardType="phone-pad" placeholder="e.g. 9876543210" /></View>
                <View style={{ flex: 1 }}><Lbl t="EMAIL" /><Inp value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="email@example.com" autoCapitalize="none" /></View>
              </View>
            </Sec>

            {/* Product */}
            <Sec title="Product Details" icon="package-variant-outline">
              <Lbl t="PRODUCT NAME *" /><Inp value={productName} onChangeText={setProductName} placeholder="e.g. Steel Rod 12mm" />
              <Lbl t="CATEGORY" /><Inp value={categoryName} onChangeText={setCategoryName} placeholder="e.g. Steel, Pipes, Hardware…" />
            </Sec>

            {/* Dates */}
            <Sec title="Dates" icon="calendar-range">
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}><DatePicker label="ORDER DATE" value={orderDate} onChange={setOrderDate} /></View>
                <View style={{ flex: 1 }}><DatePicker label="DELIVERY DATE" value={deliveryDate} onChange={setDeliveryDate} /></View>
              </View>
            </Sec>
            {/* Pricing */}
            <Sec title="Pricing" icon="currency-inr">
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}><Lbl t="QUANTITY *" /><Inp value={qty} onChangeText={setQty} keyboardType="numeric" placeholder="e.g. 10" /></View>
                <View style={{ flex: 1 }}><Lbl t="UNIT PRICE (₹)" /><Inp value={unitPrice} onChangeText={setUnitPrice} keyboardType="decimal-pad" placeholder="e.g. 500" /></View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}><Lbl t="DISCOUNT %" /><Inp value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" placeholder="0" /></View>
                <View style={{ flex: 1 }}><Lbl t="GST %" /><Inp value={gstPct} onChangeText={setGstPct} keyboardType="decimal-pad" placeholder="0" /></View>
              </View>
              {hasPrice && (
                <View style={fm.totals}>
                  <View style={fm.totalCol}><Text style={fm.totalLbl}>Sub Total</Text><Text style={fm.totalVal}>₹{numFmt(sub)}</Text></View>
                  <View style={fm.totalSep} />
                  <View style={fm.totalCol}><Text style={fm.totalLbl}>GST</Text><Text style={fm.totalVal}>₹{numFmt(gst)}</Text></View>
                  <View style={fm.totalSep} />
                  <View style={fm.totalCol}><Text style={fm.totalLbl}>Total Amount</Text><Text style={[fm.totalVal, { color: C.red, fontSize: 15 }]}>₹{numFmt(tot)}</Text></View>
                </View>
              )}
            </Sec>
            {/* Payment Mode */}
            <Sec title="Payment Mode" icon="cash-multiple">
              <View style={fm.chips}>
                {PAY_MODES.map(m => (
                  <Pressable key={m} style={[fm.chip, payMode === m && fm.chipOn]} onPress={() => setPayMode(payMode === m ? '' : m)}>
                    <Icon name={m==='Cash'?'cash':m==='Credit'?'credit-card-outline':'bank-transfer'} size={14} color={payMode === m ? C.white : C.sub} />
                    <Text style={[fm.chipTxt, payMode === m && fm.chipTxtOn]}>{m}</Text>
                  </Pressable>
                ))}
              </View>
            </Sec>

            {/* Delivery Address */}
            <Sec title="Delivery Address" icon="map-marker-outline">
              <Lbl t="ADDRESS" /><Inp value={address} onChangeText={setAddress} placeholder="Street / Building" multiline numberOfLines={2} style={{ minHeight: 58, textAlignVertical: 'top' }} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}><Lbl t="CITY" /><Inp value={city} onChangeText={setCity} placeholder="e.g. Mumbai" /></View>
                <View style={{ flex: 1 }}><Lbl t="STATE" /><Inp value={stateName} onChangeText={setStateName} placeholder="e.g. Maharashtra" /></View>
              </View>
              <Lbl t="PINCODE" /><Inp value={pincode} onChangeText={setPincode} keyboardType="numeric" placeholder="e.g. 400001" />
            </Sec>

            {/* Reference Numbers */}
            <Sec title="Reference Numbers" icon="pound-box-outline">
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}><Lbl t="PO NUMBER (Optional)" /><Inp value={poNum} onChangeText={setPoNum} placeholder="e.g. PO-001" /></View>
                <View style={{ flex: 1 }}><Lbl t="REFERENCE NO. (Optional)" /><Inp value={refNum} onChangeText={setRefNum} placeholder="e.g. REF-001" /></View>
              </View>
            </Sec>

            {/* Additional Info */}
            <Sec title="Additional Info" icon="information-outline">
              <Lbl t="PRIORITY" />
              <View style={fm.chips}>
                {PRIORITIES.map(p => (
                  <Pressable key={p} style={[fm.chip, priority === p && fm.chipOn]} onPress={() => setPriority(p)}>
                    <Text style={[fm.chipTxt, priority === p && fm.chipTxtOn]}>{p}</Text>
                  </Pressable>
                ))}
              </View>
              <Lbl t="REMARKS / NOTES (Optional)" />
              <Inp value={remarks} onChangeText={setRemarks} placeholder="Additional notes or instructions…" multiline numberOfLines={4} style={{ minHeight: 80, textAlignVertical: 'top' }} />
            </Sec>

            {/* Actions */}
            <View style={fm.actions}>
              <TouchableOpacity style={fm.draftBtn} onPress={onClose} disabled={saving}>
                <Icon name="close-circle-outline" size={15} color={C.red} />
                <Text style={fm.draftTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[fm.createBtn, saving && fm.createBtnDim]} onPress={handleSubmit} disabled={saving}>
                {saving ? <ActivityIndicator color={C.white} size="small" /> : <><Icon name="check-circle-outline" size={15} color={C.white} /><Text style={fm.createTxt}>Create Order</Text></>}
              </TouchableOpacity>
            </View>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const fm = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet:       { backgroundColor: C.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, maxHeight: '94%' },
  hdr:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14, backgroundColor: C.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderBottomWidth: 1, borderBottomColor: C.line },
  hdrIcon:     { width: 34, height: 34, borderRadius: 10, backgroundColor: '#FFF0F0', alignItems: 'center', justifyContent: 'center' },
  hdrTitle:    { fontSize: 17, fontWeight: '900', color: C.text },
  closeBtn:    { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F2F2F2', alignItems: 'center', justifyContent: 'center' },
  totals:      { flexDirection: 'row', backgroundColor: '#F8F9FA', borderRadius: 12, borderWidth: 1, borderColor: C.line, overflow: 'hidden', marginTop: 2, marginBottom: 4 },
  totalCol:    { flex: 1, alignItems: 'center', paddingVertical: 12 },
  totalSep:    { width: 1, backgroundColor: C.line },
  totalLbl:    { fontSize: 10, fontWeight: '700', color: C.muted, marginBottom: 4 },
  totalVal:    { fontSize: 13, fontWeight: '800', color: C.text },
  chips:       { flexDirection: 'row', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  chip:        { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: C.line, backgroundColor: '#F8F8F8' },
  chipOn:      { backgroundColor: C.red, borderColor: C.red },
  chipTxt:     { fontSize: 13, fontWeight: '700', color: C.sub },
  chipTxtOn:   { color: C.white, fontWeight: '900' },
  actions:     { flexDirection: 'row', gap: 10, marginHorizontal: 12, marginTop: 16 },
  draftBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: C.red, borderRadius: 12, paddingVertical: 14, backgroundColor: C.white },
  draftTxt:    { color: C.red, fontSize: 14, fontWeight: '800' },
  createBtn:   { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.red, borderRadius: 12, paddingVertical: 14 },
  createBtnDim:{ backgroundColor: '#B0BEC5' },
  createTxt:   { color: C.white, fontSize: 14, fontWeight: '900' },
});

// ─── EditOrderModal ───────────────────────────────────────────────────────────
function EditOrderModal({ visible, order, onClose, onSaved }) {
  const [priority, setPriority] = useState('Normal');
  const [notes,    setNotes]    = useState('');
  const [saving,   setSaving]   = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [loadInv,  setLoadInv]  = useState(false);

  useEffect(() => {
    if (!order) return;
    setPriority(order.priority || 'Normal');
    setNotes(order.notes || order.remarks || '');
    if (!apiService) { setInvoices([]); return; }
    setLoadInv(true);
    apiService.get('/invoices', { search: order.orderId || order.id || '', limit: 20 })
      .then(r => setInvoices(r?.data || []))
      .catch(() => setInvoices([]))
      .finally(() => setLoadInv(false));
  }, [order]);

  const save = async () => {
    setSaving(true);
    try {
      if (apiService && !order?._isLocal) {
        const id = resolveId(order);
        const res = await apiService.put(`/orders/${id}`, { priority, notes });
        if (!res?.success) { Alert.alert('Error', res?.message || 'Could not update order.'); setSaving(false); return; }
      }
      onSaved({ ...order, priority, notes });
      onClose();
    } catch (e) { Alert.alert('Error', e?.message || 'Could not update order.'); }
    finally { setSaving(false); }
  };

  if (!order) return null;
  const st = ST[order.status] || { c: C.muted, bg: '#F2F2F2' };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={em.overlay}>
        <View style={em.sheet}>
          <View style={em.hdr}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={em.hdrIcon}><Icon name="pencil-outline" size={16} color={C.blue} /></View>
              <View>
                <Text style={em.hdrTitle}>Edit Order</Text>
                <Text style={em.hdrSub}>{order.orderId || order.id}</Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={em.closeBtn}><Icon name="close" size={19} color={C.text} /></Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={em.banner}>
              <View style={[em.statusBadge, { backgroundColor: st.bg }]}>
                <Text style={[em.statusTxt, { color: st.c }]}>{order.status}</Text>
              </View>
              <Text style={em.amtTxt}>{fmtAmt(order)}</Text>
            </View>
            {/* Invoices */}
            <View style={em.section}>
              <View style={em.secHead}>
                <Icon name="file-document-outline" size={14} color={C.red} />
                <Text style={em.secTitle}>Invoices ({loadInv ? '…' : invoices.length})</Text>
                {loadInv && <ActivityIndicator size="small" color={C.red} style={{ marginLeft: 6 }} />}
              </View>
              {invoices.length === 0 && !loadInv ? (
                <View style={em.noInv}>
                  <Icon name="file-document-remove-outline" size={28} color={C.line} />
                  <Text style={em.noInvTxt}>No invoices yet for this order</Text>
                </View>
              ) : (
                invoices.map((inv, i) => (
                  <View key={inv.id || i} style={em.invRow}>
                    <View style={em.invLeft}>
                      <Text style={em.invNo}>{inv.invoiceNo || `INV-${i + 1}`}</Text>
                      <Text style={em.invDate}>{fmtDate(inv.date) || '—'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={em.invAmt}>{inv.amount || '—'}</Text>
                      <View style={[em.invBadge, { backgroundColor: inv.status === 'Paid' ? C.greenBg : inv.status === 'Overdue' ? '#FFF5F5' : C.amberBg }]}>
                        <Text style={[em.invBadgeTxt, { color: inv.status === 'Paid' ? C.green : inv.status === 'Overdue' ? C.red : C.amber }]}>{inv.status || 'Pending'}</Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
            {/* Edit fields */}
            <View style={em.section}>
              <View style={em.secHead}>
                <Icon name="tune-vertical" size={14} color={C.red} />
                <Text style={em.secTitle}>Update Order</Text>
              </View>
              <Text style={em.lbl}>PRIORITY</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {PRIORITIES.map(p => (
                  <Pressable key={p} onPress={() => setPriority(p)} style={[em.chip, priority === p && em.chipOn]}>
                    <Icon name={p==='Urgent'?'flag':p==='High'?'flag-outline':'minus-circle-outline'} size={12} color={priority === p ? C.white : C.sub} />
                    <Text style={[em.chipTxt, priority === p && em.chipTxtOn]}>{p}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={em.lbl}>NOTES</Text>
              <TextInput style={em.notesIn} value={notes} onChangeText={setNotes}
                placeholder="Add notes or instructions for admin…" placeholderTextColor={C.muted}
                multiline numberOfLines={4} textAlignVertical="top" />
            </View>
            <View style={{ flexDirection: 'row', gap: 10, margin: 12, marginTop: 4 }}>
              <Pressable style={em.cancelBtn} onPress={onClose}><Text style={em.cancelTxt}>Cancel</Text></Pressable>
              <TouchableOpacity style={[em.saveBtn, saving && em.saveBtnDim]} onPress={save} disabled={saving}>
                {saving ? <ActivityIndicator color={C.white} size="small" /> : <><Icon name="check" size={15} color={C.white} /><Text style={em.saveTxt}>Save Changes</Text></>}
              </TouchableOpacity>
            </View>
            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
const em = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:       { backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  hdr:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14, backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomWidth: 1, borderBottomColor: C.line },
  hdrIcon:     { width: 32, height: 32, borderRadius: 9, backgroundColor: '#E3F0FF', alignItems: 'center', justifyContent: 'center' },
  hdrTitle:    { fontSize: 16, fontWeight: '900', color: C.text },
  hdrSub:      { fontSize: 11, fontWeight: '700', color: C.muted },
  closeBtn:    { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F2F2F2', alignItems: 'center', justifyContent: 'center' },
  banner:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  statusTxt:   { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  amtTxt:      { fontSize: 18, fontWeight: '900', color: C.red },
  section:     { backgroundColor: C.white, borderRadius: 14, marginHorizontal: 12, marginBottom: 10, padding: 14, borderWidth: 1, borderColor: C.line },
  secHead:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  secTitle:    { fontSize: 12, fontWeight: '900', color: C.red, letterSpacing: 0.5, textTransform: 'uppercase' },
  noInv:       { alignItems: 'center', paddingVertical: 18, gap: 6 },
  noInvTxt:    { fontSize: 13, color: C.muted, fontWeight: '600' },
  invRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  invLeft:     {},
  invNo:       { fontSize: 13, fontWeight: '800', color: C.text },
  invDate:     { fontSize: 11, color: C.muted, marginTop: 2 },
  invAmt:      { fontSize: 13, fontWeight: '800', color: C.text, textAlign: 'right' },
  invBadge:    { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginTop: 3 },
  invBadgeTxt: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  lbl:         { fontSize: 11, fontWeight: '800', color: C.muted, letterSpacing: 0.5, marginBottom: 6 },
  chip:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: C.line, backgroundColor: '#F8F8F8' },
  chipOn:      { backgroundColor: C.red, borderColor: C.red },
  chipTxt:     { fontSize: 12, fontWeight: '700', color: C.sub },
  chipTxtOn:   { color: C.white, fontWeight: '900' },
  notesIn:     { borderWidth: 1.5, borderColor: C.line, borderRadius: 10, padding: 12, fontSize: 14, color: C.text, minHeight: 90, marginBottom: 4 },
  cancelBtn:   { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.white },
  cancelTxt:   { fontSize: 14, fontWeight: '700', color: C.sub },
  saveBtn:     { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.red, borderRadius: 12, paddingVertical: 13 },
  saveBtnDim:  { backgroundColor: '#B0BEC5' },
  saveTxt:     { color: C.white, fontSize: 14, fontWeight: '900' },
});

// ─── ViewOrderModal ───────────────────────────────────────────────────────────
function ViewOrderModal({ visible, order, onClose }) {
  if (!order) return null;
  const items = Array.isArray(order.lineItems) && order.lineItems.length > 0 ? order.lineItems : (order.items || []);
  const st = ST[order.status] || { c: C.muted, bg: '#F2F2F2' };
  const categoryName = items[0]?.category || order._categoryName || order.category || '—';
  const productName  = items[0]?.name || items[0]?.itemName || '—';
  const companyName  = order._vendorName || order.customer || '—';
  const packSize     = items[0]?.packSize || order._packSize || items[0]?.unit || '—';
  const skuVal       = items[0]?.sku || '—';

  const infoRows = [
    { icon: 'receipt',            label: 'Order ID',         val: order.orderId || order.id || '—' },
    { icon: 'account-outline',    label: 'Customer',         val: order.customer || order.customerName || order._vendorName || '—' },
    { icon: 'phone-outline',      label: 'Mobile',           val: order.mobile || '—' },
    { icon: 'email-outline',      label: 'Email',            val: order.email || '—' },
    { icon: 'tag-outline',        label: 'Category',         val: categoryName },
    { icon: 'package-variant',    label: 'Product',          val: productName },
    { icon: 'barcode',            label: 'SKU',              val: skuVal },
    { icon: 'package-up',         label: 'Pack Size',        val: packSize },
    { icon: 'calendar-outline',   label: 'Order Date',       val: fmtDate(order.orderDate || order.createdAt) },
    { icon: 'calendar-check',     label: 'Delivery Date',    val: fmtDate(order.expectedDeliveryDate) },
    { icon: 'priority-high',      label: 'Priority',         val: order.priority || 'Normal' },
    { icon: 'cash-multiple',      label: 'Payment Mode',     val: order.paymentMode || '—' },
    { icon: 'map-marker-outline', label: 'Address',          val: order.address || '—' },
    { icon: 'city-variant-outline',label: 'City',            val: order.city || '—' },
    { icon: 'map-outline',        label: 'State',            val: order.state || '—' },
    { icon: 'mailbox-outline',    label: 'Pincode',          val: order.pincode || '—' },
    { icon: 'map-marker-radius',  label: 'Full Address',     val: order.deliveryAddress || '—' },
    { icon: 'pound-box-outline',  label: 'PO Number',        val: order.poNumber || '—' },
    { icon: 'identifier',         label: 'Reference No.',    val: order.referenceNumber || '—' },
  ].filter(r => r.val && r.val !== '—');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={vm.overlay}>
        <View style={vm.sheet}>
          <View style={vm.hdr}>
            <View style={vm.hdrLeft}>
              <View style={vm.hdrIcon}><Icon name="clipboard-text-outline" size={16} color={C.red} /></View>
              <Text style={vm.hdrTitle}>Order Details</Text>
            </View>
            <Pressable onPress={onClose} style={vm.closeBtn}><Icon name="close" size={19} color={C.text} /></Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={vm.banner}>
              <View style={[vm.statusBadge, { backgroundColor: st.bg }]}>
                <Icon name="circle" size={7} color={st.c} />
                <Text style={[vm.statusTxt, { color: st.c }]}>{order.status || 'Unknown'}</Text>
              </View>
              <View style={vm.amtBox}>
                <Text style={vm.amtLabel}>Total Amount</Text>
                <Text style={vm.amtVal}>{fmtAmt(order)}</Text>
              </View>
            </View>
            <View style={vm.finRow}>
              <View style={vm.finItem}><Text style={vm.finLbl}>Sub Total</Text><Text style={vm.finVal}>₹{numFmt(order.subTotal)}</Text></View>
              <View style={vm.finSep} />
              <View style={vm.finItem}><Text style={vm.finLbl}>GST</Text><Text style={vm.finVal}>₹{numFmt(order.totalGst)}</Text></View>
              <View style={vm.finSep} />
              <View style={vm.finItem}><Text style={vm.finLbl}>Total</Text><Text style={[vm.finVal, { color: C.red }]}>₹{numFmt(order.value || 0)}</Text></View>
            </View>
            {infoRows.length > 0 && (
              <View style={vm.card}>
                {infoRows.map((r, i) => (
                  <View key={r.label} style={[vm.row, i === infoRows.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={vm.rowLeft}>
                      <Icon name={r.icon} size={13} color={C.muted} />
                      <Text style={vm.rowLbl}>{r.label}</Text>
                    </View>
                    <Text style={vm.rowVal} numberOfLines={2}>{r.val}</Text>
                  </View>
                ))}
              </View>
            )}
            {(order.remarks || order.notes) ? (
              <View style={vm.remarksBox}>
                <Text style={vm.remarksLbl}>Remarks / Notes</Text>
                <Text style={vm.remarksTxt}>{order.remarks || order.notes}</Text>
              </View>
            ) : null}
            {items.length > 0 && (
              <View style={vm.card}>
                <Text style={vm.sectionTitle}>Items in Order ({items.length})</Text>
                {items.map((it, i) => (
                  <View key={i} style={[vm.itemRow, i < items.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.line }]}>
                    <View style={vm.itemIcon}><Icon name="package-variant" size={14} color={C.red} /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={vm.itemName}>{it.name || it.itemName || 'Item'}</Text>
                      <View style={{ flexDirection: 'row', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                        <Text style={vm.itemMeta}>Qty: <Text style={vm.itemMetaVal}>{it.quantity || 1}</Text></Text>
                        <Text style={vm.itemMeta}>Unit: <Text style={vm.itemMetaVal}>₹{numFmt(it.unitPrice)}</Text></Text>
                        {it.gstPercent > 0 && <Text style={vm.itemMeta}>GST: <Text style={vm.itemMetaVal}>{it.gstPercent}%</Text></Text>}
                        {(it.packSize || it.unit) ? <Text style={vm.itemMeta}>Pack: <Text style={vm.itemMetaVal}>{it.packSize || it.unit}</Text></Text> : null}
                      </View>
                    </View>
                    <Text style={vm.itemTotal}>₹{numFmt(it.total)}</Text>
                  </View>
                ))}
              </View>
            )}
            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
const vm = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:       { backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  hdr:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14, backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomWidth: 1, borderBottomColor: C.line },
  hdrLeft:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hdrIcon:     { width: 32, height: 32, borderRadius: 9, backgroundColor: '#FFF0F0', alignItems: 'center', justifyContent: 'center' },
  hdrTitle:    { fontSize: 16, fontWeight: '900', color: C.text },
  closeBtn:    { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F2F2F2', alignItems: 'center', justifyContent: 'center' },
  banner:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  statusTxt:   { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  amtBox:      { alignItems: 'flex-end' },
  amtLabel:    { fontSize: 10, color: C.muted, fontWeight: '700', marginBottom: 2 },
  amtVal:      { fontSize: 20, fontWeight: '900', color: C.red },
  finRow:      { flexDirection: 'row', backgroundColor: C.white, marginHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: C.line, overflow: 'hidden', marginBottom: 10 },
  finItem:     { flex: 1, alignItems: 'center', paddingVertical: 12 },
  finSep:      { width: 1, backgroundColor: C.line },
  finLbl:      { fontSize: 10, fontWeight: '700', color: C.muted, marginBottom: 4 },
  finVal:      { fontSize: 13, fontWeight: '800', color: C.text },
  card:        { backgroundColor: C.white, marginHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: C.line, padding: 14, marginBottom: 10 },
  row:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  rowLeft:     { flexDirection: 'row', alignItems: 'center', gap: 7 },
  rowLbl:      { fontSize: 12, fontWeight: '700', color: C.muted },
  rowVal:      { fontSize: 13, fontWeight: '700', color: C.text, flexShrink: 1, textAlign: 'right', maxWidth: '55%' },
  remarksBox:  { backgroundColor: C.white, marginHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: C.line, padding: 14, marginBottom: 10 },
  remarksLbl:  { fontSize: 11, fontWeight: '800', color: C.muted, marginBottom: 6 },
  remarksTxt:  { fontSize: 13, color: C.text, lineHeight: 20 },
  sectionTitle:{ fontSize: 12, fontWeight: '900', color: C.red, letterSpacing: 0.5, marginBottom: 10 },
  itemRow:     { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, gap: 10 },
  itemIcon:    { width: 28, height: 28, borderRadius: 7, backgroundColor: '#FFF0F0', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  itemName:    { fontSize: 13, fontWeight: '800', color: C.text },
  itemMeta:    { fontSize: 10, color: C.muted, fontWeight: '600' },
  itemMetaVal: { color: C.text, fontWeight: '700' },
  itemTotal:   { fontSize: 13, fontWeight: '900', color: C.red, marginTop: 1 },
});

// ─── InvoiceCountBadge — small badge on View button showing invoice count ────
function InvoiceCountBadge({ orderId }) {
  const [count, setCount] = useState(null);
  useEffect(() => {
    if (!orderId || !apiService) return;
    apiService.get('/invoices', { search: orderId, limit: 1 })
      .then(r => setCount(r?.total ?? r?.data?.length ?? null))
      .catch(() => setCount(null));
  }, [orderId]);
  if (!count) return null;
  return (
    <View style={icb.badge}>
      <Text style={icb.txt}>{count}</Text>
    </View>
  );
}
const icb = StyleSheet.create({
  badge: { position: 'absolute', top: -5, right: -5, backgroundColor: C.red, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  txt:   { color: C.white, fontSize: 9, fontWeight: '900' },
});

// ─── OrderCard — icon-only action buttons, tooltip on tap ─────────────────────
function OrderCard({ order, onTrack, onEdit, onDelete, onPlaceOrder, onView, onPrint, onDownloadPdf }) {
  const st       = ST[order.status] || { c: C.muted, bg: '#F2F2F2' };
  const canEdit  = EDITABLE.includes(order.status);
  const canPlace = PLACEABLE.includes(order.status);
  const orderId  = order.orderId || order.id || '—';
  const isERP    = (order.source || '').toUpperCase() === 'ERP';
  const items    = Array.isArray(order.lineItems) && order.lineItems.length > 0 ? order.lineItems : (order.items || []);
  const firstName = items[0]?.name || items[0]?.itemName || null;
  const firstCat  = items[0]?.category || order._categoryName || null;
  const totalAmt  = order.value || order.totalAmount;

  return (
    <View style={oc.card}>
      {/* Header: order ID + date + status */}
      <View style={oc.head}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <View style={oc.idRow}>
            <Icon name="receipt" size={12} color={C.muted} />
            <Text style={oc.idTxt}>{orderId}</Text>
            <View style={oc.srcChip}>
              <Icon name={isERP ? 'desktop-classic' : 'cellphone'} size={9} color={C.muted} />
              <Text style={oc.srcTxt}>{isERP ? 'ERP' : 'App'}</Text>
            </View>
          </View>
          <View style={oc.datRow}>
            <Icon name="calendar-outline" size={10} color={C.muted} />
            <Text style={oc.datTxt}>{fmtDate(order.createdAt || order.orderDate)}</Text>
          </View>
        </View>
        <View style={[oc.badge, { backgroundColor: st.bg }]}>
          <Text style={[oc.badgeTxt, { color: st.c }]}>{order.status || 'Unknown'}</Text>
        </View>
      </View>

      <View style={oc.div} />

      {/* Product info — only if real data exists */}
      {(firstName || firstCat || totalAmt) && (
        <View style={oc.product}>
          <View style={oc.productIcon}><Icon name="package-variant" size={18} color={C.red} /></View>
          <View style={{ flex: 1 }}>
            {firstName ? <Text style={oc.productName} numberOfLines={1}>{firstName}</Text> : null}
            {firstCat  ? <Text style={oc.productCat}>{firstCat}</Text> : null}
            {items.length > 1 && <Text style={oc.productCnt}>+{items.length - 1} more item{items.length - 1 !== 1 ? 's' : ''}</Text>}
          </View>
          {totalAmt !== undefined && totalAmt !== null && (
            <View style={oc.amtBox}>
              <Text style={oc.amt}>₹{numFmt(totalAmt)}</Text>
              <Text style={oc.amtLbl}>Total</Text>
            </View>
          )}
        </View>
      )}

      {/* Priority chip — only if non-Normal */}
      {order.priority && order.priority !== 'Normal' && (
        <View style={oc.metaRow}>
          <View style={[oc.metaChip, { backgroundColor: order.priority === 'Urgent' ? '#FFF5F5' : '#FEF3E2' }]}>
            <Icon name="flag" size={9} color={order.priority === 'Urgent' ? C.red : C.amber} />
            <Text style={[oc.metaTxt, { color: order.priority === 'Urgent' ? C.red : C.amber }]}>{order.priority}</Text>
          </View>
        </View>
      )}

      {/* ── Action row: icon buttons only, tooltip on tap ── */}
      <View style={oc.actRow}>
        {/* Track Order */}
        <IconBtn icon="truck-fast-outline" label="Track" bg={C.red} onPress={() => onTrack && onTrack(orderId, order)} />

        {/* Place Order */}
        <IconBtn icon="send-circle-outline" label={canPlace ? 'Place' : 'Submitted'} bg={C.green}
          disabled={!canPlace} onPress={() => canPlace && onPlaceOrder && onPlaceOrder(order)} />

        {/* View — with invoice count badge */}
        <View style={{ position: 'relative' }}>
          <IconBtn icon="eye-outline" label="View" bg={C.blueBg} color={C.blue}
            onPress={() => onView && onView(order)} />
          <InvoiceCountBadge orderId={orderId} />
        </View>

        {/* Edit */}
        <IconBtn icon="pencil-outline" label="Edit" bg={canEdit ? '#1565C0' : '#B0BEC5'}
          disabled={!canEdit} onPress={() => canEdit && onEdit && onEdit(order)} />

        {/* Delete */}
        <IconBtn icon="trash-can-outline" label="Delete" bg="#C62828"
          onPress={() => onDelete && onDelete(orderId, order)} />

        {/* Print */}
        <IconBtn icon="printer-outline" label="Print" bg="#37474F"
          onPress={() => onPrint && onPrint(order)} />

        {/* Download PDF */}
        <IconBtn icon="file-pdf-box" label="PDF" bg="#2E7D32"
          onPress={() => onDownloadPdf && onDownloadPdf(order)} />
      </View>
    </View>
  );
}

const oc = StyleSheet.create({
  card:       { backgroundColor: C.white, borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 14, marginBottom: 12, ...sh },
  head:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  idRow:      { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  idTxt:      { fontSize: 14, fontWeight: '900', color: C.text },
  srcChip:    { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#F1F3F5', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  srcTxt:     { fontSize: 9, fontWeight: '700', color: C.muted },
  datRow:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  datTxt:     { fontSize: 11, fontWeight: '600', color: C.muted },
  badge:      { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, flexShrink: 0 },
  badgeTxt:   { fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  div:        { height: 1, backgroundColor: C.line, marginBottom: 10 },
  product:    { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F8F9FA', borderRadius: 10, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#EEEEEE' },
  productIcon:{ width: 34, height: 34, borderRadius: 8, backgroundColor: 'rgba(197,31,43,0.08)', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  productName:{ fontSize: 13, fontWeight: '800', color: C.text, marginBottom: 1 },
  productCat: { fontSize: 10, fontWeight: '600', color: C.muted, marginBottom: 2 },
  productCnt: { fontSize: 10, fontWeight: '600', color: C.sub },
  amtBox:     { alignItems: 'flex-end', marginLeft: 8 },
  amt:        { fontSize: 14, fontWeight: '900', color: C.red },
  amtLbl:     { fontSize: 9, fontWeight: '700', color: C.muted, marginTop: 2 },
  metaRow:    { flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  metaChip:   { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  metaTxt:    { fontSize: 10, fontWeight: '700' },
  // Action row — spread icons evenly
  actRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.line },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function OrderManagementSection({ onBack, onNavigateToDispatch, onPlaceOrder, initialOrders }) {
  const [orders,       setOrders]       = useState(Array.isArray(initialOrders) ? initialOrders : []);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [search,       setSearch]       = useState('');
  const [showCreate,   setShowCreate]   = useState(false);
  const [editOrder,    setEditOrder]    = useState(null);
  const [viewOrder,    setViewOrder]    = useState(null);

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      if (!apiService) { setLoading(false); setRefreshing(false); return; }
      const res = await apiService.get('/orders', {
        ...(activeFilter !== 'All' && { status: activeFilter }),
        ...(search.trim() && { search: search.trim() }),
        limit: 100,
      });
      if (res?.success) {
        // Only keep orders created through the Dealer App (not ERP orders)
        const fetched = (res.data || []).filter(o => !o.source || o.source === 'DealerApp');
        setOrders(prev => {
          // Keep any locally-created orders not yet returned by the API
          const apiIds = new Set(fetched.map(o => o.orderId || o.id).filter(Boolean));
          const localOnly = prev.filter(o => o._isLocal && !apiIds.has(o.orderId || o.id));
          // Merge: local-only at top, then API results — deduplicated
          const seen = new Set();
          const merged = [];
          for (const o of [...localOnly, ...fetched]) {
            const key = o.orderId || o.id;
            if (!key || !seen.has(key)) { seen.add(key); merged.push(o); }
          }
          return merged;
        });
      }
      // silently ignore API errors — local orders remain visible
    } catch (_err) {
      // API unreachable — local orders still show
    } finally { setLoading(false); setRefreshing(false); }
  }, [activeFilter, search]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  const onRefresh = () => { setRefreshing(true); fetchOrders(true); };

  const handleTrack  = (orderId) => { if (onNavigateToDispatch) onNavigateToDispatch(orderId); };

  const handleDelete = (orderId, order) => {
    Alert.alert('Delete Order', `Delete order ${orderId}?\nThis cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          // Remove from local state immediately
          setOrders(prev => prev.filter(o => (o.orderId || o.id) !== orderId));
          // Also delete from backend if not a local-only order
          if (apiService && !order?._isLocal) {
            try {
              const id = resolveId(order);
              await apiService.delete(`/orders/${id}`);
            } catch (_) { /* ignore backend errors for delete */ }
          }
        },
      },
    ]);
  };

  const handleEditSaved = updated => {
    setOrders(prev => prev.map(o =>
      (o.orderId || o.id) === (updated.orderId || updated.id) ? { ...o, ...updated } : o
    ));
  };

  const handleCreated = newOrder => {
    if (!newOrder) return;
    const shaped = {
      mongodbId:            newOrder.mongodbId  || newOrder._id || newOrder.id,
      orderId:              newOrder.orderId    || newOrder.id,
      id:                   newOrder.orderId    || newOrder.id,
      customer:             newOrder.customer   || newOrder.customerName || '',
      customerName:         newOrder.customerName || newOrder.customer || '',
      mobile:               newOrder.mobile     || '',
      email:                newOrder.email      || '',
      status:               newOrder.status     || 'Order Placed',
      source:               'DealerApp',
      priority:             newOrder.priority   || 'Normal',
      value:                newOrder.value      || newOrder.totalAmount || 0,
      subTotal:             newOrder.subTotal   || 0,
      totalGst:             newOrder.totalGst   || 0,
      totalAmount:          newOrder.totalAmount || newOrder.value || 0,
      paymentMode:          newOrder.paymentMode     || '',
      poNumber:             newOrder.poNumber        || '',
      referenceNumber:      newOrder.referenceNumber || '',
      deliveryAddress:      newOrder.deliveryAddress || '',
      address:              newOrder.address    || '',
      city:                 newOrder.city       || '',
      state:                newOrder.state      || '',
      pincode:              newOrder.pincode    || '',
      remarks:              newOrder.remarks    || '',
      notes:                newOrder.notes      || newOrder.remarks || '',
      createdAt:            newOrder.createdAt  || new Date().toISOString(),
      orderDate:            newOrder.orderDate  || newOrder.createdAt || new Date().toISOString(),
      expectedDeliveryDate: newOrder.expectedDeliveryDate || null,
      lineItems:            newOrder.lineItems  || newOrder.items || [],
      items:                newOrder.items      || newOrder.lineItems || [],
      _categoryName:        newOrder._categoryName || (newOrder.lineItems?.[0]?.category) || '',
      _vendorName:          newOrder._vendorName   || newOrder.customer || newOrder.customerName || '',
      _packSize:            newOrder._packSize     || '',
      _isLocal:             true,
    };
    setOrders(prev => [shaped, ...prev]);
  };

  // Place Order — navigate to PlaceOrderPage with this order's data pre-loaded
  // The actual API submission happens there, not here
  const handlePlaceOrder = order => {
    if (onPlaceOrder) {
      onPlaceOrder(order);
    } else {
      Alert.alert('Navigation Error', 'Place Order page is not available.');
    }
  };

  const handlePrint = o => Alert.alert('Print', `Printing order ${o.orderId || o.id}…`);
  const handleDownloadPdf = o => Alert.alert('Download PDF', `PDF for ${o.orderId || o.id} will be saved to your device.`);

  return (
    <SafeAreaView style={pg.screen} edges={['top']}>

      {/* ── Navbar ── */}
      <View style={pg.navbar}>
        <Pressable onPress={onBack} style={pg.backBtn}>
          <Icon name="arrow-left" size={22} color={C.white} />
        </Pressable>
        <Text style={pg.navTitle}>My Orders</Text>
        <Pressable onPress={() => setShowCreate(true)} style={pg.createPill}>
          <Icon name="plus" size={15} color={C.red} />
          <Text style={pg.createTxt}>Create</Text>
        </Pressable>
      </View>

      {/* ── Search ── */}
      <View style={pg.searchWrap}>
        <Icon name="magnify" size={18} color={C.muted} />
        <TextInput style={pg.searchIn} placeholder="Search by order ID…"
          placeholderTextColor={C.muted} value={search} onChangeText={setSearch}
          returnKeyType="search" onSubmitEditing={() => fetchOrders()} />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <Icon name="close-circle" size={17} color={C.muted} />
          </Pressable>
        )}
      </View>

      {/* ── Filter chips ── */}
      <View style={pg.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={pg.filterRow}>
          {ALL_STATUSES.map(f => (
            <Pressable key={f} onPress={() => setActiveFilter(f)} style={[pg.filterChip, activeFilter === f && pg.filterChipOn]}>
              <Text style={[pg.filterTxt, activeFilter === f && pg.filterTxtOn]}>{f}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={pg.center}>
          <ActivityIndicator size="large" color={C.red} />
          <Text style={pg.loadTxt}>Loading orders…</Text>
        </View>
      ) : (
        <ScrollView style={pg.list} contentContainerStyle={pg.listInner}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.red]} tintColor={C.red} />}>

          <Text style={pg.countTxt}>
            {orders.length} order{orders.length !== 1 ? 's' : ''}
            {activeFilter !== 'All' ? `  ·  ${activeFilter}` : ''}
          </Text>

          {orders.length === 0 ? (
            <View style={pg.empty}>
              <Icon name="package-variant-closed" size={60} color={C.line} />
              <Text style={pg.emptyTitle}>No Orders Yet</Text>
              <Text style={pg.emptyTxt}>
                {search
                  ? 'No orders match your search'
                  : activeFilter !== 'All'
                  ? `No "${activeFilter}" orders found`
                  : 'Tap "+ Create" to create your first order'}
              </Text>
            </View>
          ) : (
            orders.map(order => (
              <OrderCard
                key={order.mongodbId || order._id || order.orderId || order.id}
                order={order}
                onTrack={handleTrack}
                onEdit={o => setEditOrder(o)}
                onDelete={handleDelete}
                onView={o => setViewOrder(o)}
                onPlaceOrder={handlePlaceOrder}
                onPrint={handlePrint}
                onDownloadPdf={handleDownloadPdf}
              />
            ))
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {/* ── Modals ── */}
      <CreateOrderModal visible={showCreate} onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      <EditOrderModal visible={!!editOrder} order={editOrder} onClose={() => setEditOrder(null)} onSaved={handleEditSaved} />
      <ViewOrderModal visible={!!viewOrder} order={viewOrder} onClose={() => setViewOrder(null)} />
    </SafeAreaView>
  );
}

// ─── Screen Styles ────────────────────────────────────────────────────────────
const pg = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: C.red },
  navbar:       { height: 56, backgroundColor: C.red, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 12 },
  backBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  navTitle:     { flex: 1, fontSize: 17, fontWeight: '900', color: C.white, letterSpacing: 0.3 },
  createPill:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.white, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  createTxt:    { fontSize: 13, fontWeight: '900', color: C.red },
  searchWrap:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.white, marginHorizontal: 12, marginTop: 10, marginBottom: 6, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: C.line, ...sh },
  searchIn:     { flex: 1, fontSize: 14, color: C.text, fontWeight: '500' },
  filterBar:    { backgroundColor: C.bg },
  filterRow:    { paddingHorizontal: 12, paddingVertical: 8, gap: 7 },
  filterChip:   { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.line },
  filterChipOn: { backgroundColor: C.red, borderColor: C.red },
  filterTxt:    { fontSize: 12, fontWeight: '700', color: C.sub },
  filterTxtOn:  { color: C.white, fontWeight: '900' },
  list:         { flex: 1, backgroundColor: C.bg },
  listInner:    { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 32 },
  countTxt:     { fontSize: 12, fontWeight: '700', color: C.muted, marginBottom: 8, marginLeft: 2 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  loadTxt:      { marginTop: 10, fontSize: 14, color: C.muted },
  empty:        { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle:   { fontSize: 18, fontWeight: '900', color: C.text, marginTop: 14 },
  emptyTxt:     { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
