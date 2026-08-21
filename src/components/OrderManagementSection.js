/**
 * OrderManagementSection.js
 * My Orders screen — create + manage orders
 *
 * Card buttons: Place Order, View, Edit, PDF
 * Card: shows order data (product, category, amount, status, date)
 * Create Order: dealer info auto-filled from logged-in account; no address/date/reference fields
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ActivityIndicator, Alert, Modal, Platform, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Safe LinearGradient fallback — no crash if package missing
let LinearGradient;
try { LinearGradient = require('react-native-linear-gradient').default; } catch (_) { LinearGradient = null; }
const NavGradient = ({ style, children }) => LinearGradient
  ? <LinearGradient colors={['#E8374A', '#C8102E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={style}>{children}</LinearGradient>
  : <View style={[style, { backgroundColor: '#E8374A' }]}>{children}</View>;

// ─── apiService (dealer backend only — no admin calls) ────────────────────────
let apiService;
try { apiService = require('./services/apiService').default; } catch (_) { apiService = null; }

// ─── inventoryService (stock-items fetch with field normalisation) ────────────
let inventoryService;
try { inventoryService = require('./services/inventoryService').default; } catch (_) { inventoryService = null; }

// ─── AsyncStorage for persisting local orders across reloads ─────────────────
let AsyncStorage;
try { AsyncStorage = require('@react-native-async-storage/async-storage').default; } catch (_) { AsyncStorage = null; }

const ORDERS_STORAGE_KEY = '@dealer_orders_local';

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  red: '#E8374A', redDk: '#C8102E',          // accent only — icons, badges, buttons
  bg: '#F1F4F8', white: '#FFFFFF',
  text: '#0F172A', sub: '#374151', muted: '#6B7280', line: '#E4E9F0',
  green: '#16A34A', greenBg: '#DCFCE7',
  amber: '#D97706', amberBg: '#FEF3C7',
  blue: '#2563EB', blueBg: '#DBEAFE',
  teal: '#0D9488', tealBg: '#CCFBF1',
  purple: '#7C3AED', purpleBg: '#EDE9FE',
  navy: '#1D4ED8', navyBg: '#DBEAFE',
  olive: '#65A30D', oliveBg: '#ECFCCB',
};
const sh  = { shadowColor: '#1B2A4A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 };
const sh2 = { shadowColor: '#1B2A4A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 14, elevation: 5 };

// ─── Constants ────────────────────────────────────────────────────────────────
// Status chip configs — label + icon for filter bar
const STATUS_META = {
  'All':              { icon: 'view-grid-outline',         color: '#64748B' },
  'Order Placed':     { icon: 'clipboard-text-outline',    color: '#2563EB' },
  'Pending Approval': { icon: 'clock-outline',             color: '#D97706' },
  'Approved':         { icon: 'check-circle-outline',      color: '#16A34A' },
  'Processing':       { icon: 'cog-outline',               color: '#7C3AED' },
  'Shipped':          { icon: 'truck-delivery-outline',    color: '#0891B2' },
  'Delivered':        { icon: 'home-check-outline',        color: '#16A34A' },
  'Cancelled':        { icon: 'close-circle-outline',      color: '#E8374A' },
  'Rejected':         { icon: 'cancel',                    color: '#E8374A' },
};

const ALL_STATUSES = [
  'All','Order Placed','Pending Approval','Approved','Rejected',
  'Picking Started','Picking Completed','Sorting Started','Sorting Completed',
  'Packing Started','Packing Completed','Invoice Generated','Ready for Dispatch',
  'Dispatched','In Transit','Delivered','Cancelled',
];
// Quick filter chips shown in the filter bar (subset for easy access)
const QUICK_FILTERS = [
  'All', 'Order Placed', 'Pending Approval', 'Approved', 'Rejected',
  'Dispatched', 'Delivered', 'Cancelled',
];
const EDITABLE   = ['Order Placed', 'Pending Approval'];
const PLACEABLE  = ['Order Placed'];
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
function CreateOrderModal({ visible, onClose, onCreated, dealer }) {
  const [saving, setSaving] = useState(false);

  // ── Resolved dealer profile — prop first, then AsyncStorage fallback ─────
  // This ensures Create Order always shows the currently logged-in dealer,
  // never a stale/wrong dealer from a previous session.
  const [resolvedDealer, setResolvedDealer] = useState(dealer || null);
  useEffect(() => {
    if (!visible) return;
    // Prefer the prop if it has a name/mobile
    if (dealer?.name || dealer?.businessName || dealer?.mobile) {
      setResolvedDealer(dealer);
      return;
    }
    // Fallback: load from AsyncStorage
    if (AsyncStorage) {
      AsyncStorage.getItem('dealerProfile')
        .then(raw => {
          if (raw) {
            try { setResolvedDealer(JSON.parse(raw)); } catch (_) {}
          }
        })
        .catch(() => {});
    }
  }, [visible, dealer]);

  // ── Company/Vendor dropdown ───────────────────────────────────────────────
  const [companies,        setCompanies]        = useState([]);
  const [selectedCompany,  setSelectedCompany]  = useState(null);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  // ── Product search + list ─────────────────────────────────────────────────
  const [allProducts,       setAllProducts]       = useState([]);   // full list from API
  const [products,          setProducts]          = useState([]);   // filtered display list
  const [productSearch,     setProductSearch]     = useState('');   // search box text
  const [selectedProduct,   setSelectedProduct]   = useState(null);
  const [loadingProducts,   setLoadingProducts]   = useState(false);
  const [showProductList,   setShowProductList]   = useState(false); // show dropdown list

  // Derived — auto-filled, read-only
  const productName  = selectedProduct?.name     || '';
  const productId    = selectedProduct?.id       || selectedProduct?._id   || '';

  // ── Form fields ───────────────────────────────────────────────────────────
  const [qty,          setQty]          = useState('');
  const [unitPrice,    setUnitPrice]    = useState('');
  const [discount,     setDiscount]     = useState('');
  const [gstPct,       setGstPct]       = useState('');
  const [payMode,      setPayMode]      = useState('');
  const [address,      setAddress]      = useState('');
  const [city,         setCity]         = useState('');
  const [stateName,    setStateName]    = useState('');
  const [pincode,      setPincode]      = useState('');
  const [poNum,        setPoNum]        = useState('');
  const [refNum,       setRefNum]       = useState('');
  const [remarks,      setRemarks]      = useState('');
  const [priority,     setPriority]     = useState('Normal');
  const [orderDate,    setOrderDate]    = useState(TODAY);
  const [deliveryDate, setDeliveryDate] = useState(null);

  // Unit from product (display only)
  const unit = selectedProduct?.unit || selectedProduct?.uom || selectedProduct?.packSize || '';

  const qtyN   = Number(qty)       || 0;
  const priceN = Number(unitPrice) || 0;
  const discN  = Number(discount)  || 0;
  const gstN   = Number(gstPct)    || 0;
  const hasPrice = qtyN > 0 && priceN > 0;
  const sub = hasPrice ? +(qtyN * priceN * (1 - discN / 100)).toFixed(2) : 0;
  const gst = hasPrice ? +((sub * gstN) / 100).toFixed(2) : 0;
  const tot = +(sub + gst).toFixed(2);

  // ── Extract brand/company from item name (first word = brand) ─────────────
  // "Maharaja Garment Steamer Pure Pop Red" → "Maharaja"
  // Works for any item — no hardcoding.
  const detectCompany = (name = '') => {
    const cleaned = name.trim();
    if (!cleaned) return null;
    const firstWord = cleaned.split(/\s+/)[0];
    return firstWord.length > 1 ? firstWord : null;
  };

  // ── Load all stock items from /inventory/stock-items ──────────────────────
  const loadAllData = () => {
    if (!inventoryService && !apiService) return;
    setLoadingProducts(true);
    setLoadingCompanies(true);

    const fetchFn = inventoryService
      ? inventoryService.getStockItems()
      : apiService.get('/inventory/stock-items');

    fetchFn
      .then(r => {
        const prods = r?.data || [];
        setAllProducts(prods);
        setProducts(prods);

        // Build unique company list from first word of each item name
        const seen = new Set();
        const companyList = [];
        prods.forEach(p => {
          const brand = detectCompany(p.name || p.itemName || '');
          if (brand && !seen.has(brand.toLowerCase())) {
            seen.add(brand.toLowerCase());
            companyList.push({ id: brand, name: brand });
          }
        });
        // Sort alphabetically
        companyList.sort((a, b) => a.name.localeCompare(b.name));
        setCompanies(companyList);
      })
      .catch(() => {
        setAllProducts([]);
        setProducts([]);
        setCompanies([]);
      })
      .finally(() => {
        setLoadingProducts(false);
        setLoadingCompanies(false);
      });
  };

  // ── Company selected → filter products by that company ───────────────────
  const handleCompanySelect = (company) => {
    setSelectedCompany(company);
    setSelectedProduct(null);
    setProductSearch('');
    setShowProductList(false);
    // Filter all products whose name starts with this company
    const filtered = allProducts.filter(p => {
      const brand = detectCompany(p.name || p.itemName || '');
      return brand && brand.toLowerCase() === company.name.toLowerCase();
    });
    setProducts(filtered);
  };

  // ── Live search filter (respects selected company) ────────────────────────
  const handleProductSearch = (text) => {
    setProductSearch(text);
    setShowProductList(true);
    // Base list: if company selected, only that company's items; else all
    const base = selectedCompany
      ? allProducts.filter(p => {
          const brand = detectCompany(p.name || p.itemName || '');
          return brand && brand.toLowerCase() === selectedCompany.name.toLowerCase();
        })
      : allProducts;
    if (!text.trim()) {
      setProducts(base);
      return;
    }
    const q = text.toLowerCase();
    setProducts(
      base.filter(p =>
        (p.name || p.itemName || '').toLowerCase().includes(q) ||
        (p.sku  || p.itemCode || '').toLowerCase().includes(q)
      )
    );
  };

  // ── Product selected → auto-fill all fields from Tally/ERP data ──────────
  const handleProductSelect = (prod) => {
    setSelectedProduct(prod);
    setProductSearch(prod.name || prod.itemName || '');
    setShowProductList(false);

    // Price from Tally/ERP — unitPrice or sellingPrice, no manual entry
    const autoPrice = prod.unitPrice ?? prod.sellingPrice ?? prod.price ?? prod.basePrice ?? 0;
    const autoGst   = prod.gst ?? prod.gstPercent ?? 0;
    const autoDisc  = prod.discountPercentage ?? prod.discount ?? 0;
    const autoMoq   = prod.moq ?? prod.minQuantity ?? prod.minQty ?? 1;
    setUnitPrice(autoPrice > 0 ? String(autoPrice) : '');
    setGstPct(autoGst > 0 ? String(autoGst) : '');
    setDiscount(autoDisc > 0 ? String(autoDisc) : '');
    setQty(String(autoMoq));
  };

  // ── Invoice count for selected product ────────────────────────────────────
  const [productInvoiceInfo, setProductInvoiceInfo] = useState(null);
  const [loadingProductInv,  setLoadingProductInv]  = useState(false);

  useEffect(() => {
    setProductInvoiceInfo(null);
    if (!selectedProduct || !apiService) return;
    const sku = selectedProduct.sku || selectedProduct.itemCode || '';
    const pid = selectedProduct._id || selectedProduct.id || '';
    if (!sku && !pid) return;
    setLoadingProductInv(true);
    apiService.get('/invoices', { ...(sku ? { sku } : { productId: pid }), limit: 50 })
      .then(r => {
        const list = r?.data || [];
        if (list.length > 0) {
          const totalAmt = list.reduce((s, i) => s + (i.grandTotal || 0), 0);
          setProductInvoiceInfo({ count: list.length, totalAmt, latest: list[0] });
        } else {
          setProductInvoiceInfo({ count: 0 });
        }
      })
      .catch(() => setProductInvoiceInfo(null))
      .finally(() => setLoadingProductInv(false));
  }, [selectedProduct]);

  const reset = () => {
    setSelectedCompany(null);
    setAllProducts([]); setProducts([]); setProductSearch('');
    setSelectedProduct(null); setShowProductList(false);
    setProductInvoiceInfo(null);
    setQty(''); setUnitPrice(''); setDiscount(''); setGstPct('');
    setPayMode(''); setAddress(''); setCity(''); setStateName(''); setPincode('');
    setPoNum(''); setRefNum(''); setRemarks(''); setPriority('Normal');
    setOrderDate(TODAY); setDeliveryDate(null);
  };

  useEffect(() => {
    if (!visible) return;
    reset();
    loadAllData();
  }, [visible]);

  const handleSubmit = async () => {
    if (!productName.trim()) { Alert.alert('Validation', 'Please select a Product.');        return; }
    if (!qty || qtyN < 1)    { Alert.alert('Validation', 'Enter a valid quantity (min 1).'); return; }

    setSaving(true);
    const now      = new Date().toISOString();
    const fullAddr = [address.trim(), city.trim(), stateName.trim(), pincode.trim()].filter(Boolean).join(', ');

    // Dealer info — always from the resolved (logged-in) dealer profile
    const dealerInfo = {
      name:    resolvedDealer?.businessName || resolvedDealer?.name || resolvedDealer?.dealerName || '',
      mobile:  resolvedDealer?.mobile || resolvedDealer?.phone || '',
      email:   resolvedDealer?.email || '',
      address: fullAddr || resolvedDealer?.address || '',
    };

    // ── POST to dealer backend ────────────────────────────────────────────────
    let savedOrder = null;
    if (apiService && productId) {
      try {
        const res = await apiService.post('/orders/create-form', {
          // Send both _id and sku so backend can resolve product regardless of which model the id belongs to
          productId:            selectedProduct?._id || productId,
          productSku:           selectedProduct?.sku || selectedProduct?.itemCode || undefined,
          productName:          productName || undefined,
          quantity:             qtyN,
          unitPrice:            priceN || undefined,
          discount:             discN  || undefined,
          gstPercent:           gstN   || undefined,
          priority,
          paymentMode:          payMode,
          deliveryAddress:      fullAddr,
          orderDate:            toISO(orderDate) || now,
          expectedDeliveryDate: deliveryDate ? toISO(deliveryDate) : undefined,
          remarks:              remarks.trim(),
          poNumber:             poNum.trim(),
          referenceNumber:      refNum.trim(),
          vendor:               dealerInfo.name,
        });
        if (res?.success && res?.data) savedOrder = res.data;
      } catch (err) {
        console.warn('Backend save failed, showing locally:', err?.message);
      }
    }

    // ── Build local order for immediate card display ───────────────────────────
    const localId  = savedOrder?.orderId || ('ORD-' + Date.now());
    const lineItem = {
      productId,
      name:       productName,
      category:   '',
      sku:        selectedProduct?.sku || '',
      quantity:   qtyN,
      unitPrice:  priceN,
      discount:   discN,
      gstPercent: gstN,
      gstAmount:  savedOrder?.totalGst   ?? gst,
      total:      savedOrder?.totalValue ?? tot,
      packSize:   unit,
    };

    const newOrder = {
      mongodbId:            savedOrder?.mongodbId || localId,
      orderId:              localId,
      id:                   localId,
      customer:             dealerInfo.name,
      customerName:         dealerInfo.name,
      mobile:               dealerInfo.mobile,
      email:                dealerInfo.email,
      company:              selectedCompany?.name || '',
      _categoryName:        '',
      _vendorName:          selectedCompany?.name || dealerInfo.name,
      _packSize:            unit,
      status:               savedOrder?.status || 'Order Placed',
      source:               'DealerApp',
      priority,
      value:                savedOrder?.totalValue ?? tot,
      subTotal:             savedOrder?.subTotal   ?? sub,
      totalGst:             savedOrder?.totalGst   ?? gst,
      totalAmount:          savedOrder?.totalValue ?? tot,
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
      createdAt:            savedOrder?.createdAt || now,
      orderDate:            toISO(orderDate) || now,
      expectedDeliveryDate: deliveryDate ? toISO(deliveryDate) : null,
      lineItems:            [lineItem],
      items:                [lineItem],
      _isLocal:             !savedOrder,
    };

    setSaving(false);
    onCreated(newOrder);
    onClose();
    Alert.alert(
      '✅ Order Created',
      `Order ${localId} created.\nStatus: Pending Approval`,
    );
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

            {/* ── Product Selection ──────────────────────────────────────────── */}
            <Sec title="Product Selection" icon="package-search">

              {/* STEP 1: Select Company */}
              <SDropdown
                label="SELECT COMPANY / BRAND *"
                placeholder={loadingCompanies ? 'Loading companies…' : 'Select company…'}
                value={selectedCompany?.id || ''}
                items={companies}
                keyField="id"
                labelField="name"
                loading={loadingCompanies}
                onSelect={handleCompanySelect}
              />

              {/* STEP 2: Search & Select Product (only after company selected) */}
              {selectedCompany && (
                <>
                  <Lbl t="SEARCH & SELECT PRODUCT *" />
                  {/* Tappable field — opens the product picker Modal */}
                  <Pressable
                    style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: selectedProduct ? C.red : C.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: C.white, gap: 8 }}
                    onPress={() => {
                      if (!productSearch) setProducts(allProducts.filter(p => detectCompany(p.name || p.itemName || '')?.toLowerCase() === selectedCompany.name.toLowerCase()));
                      setShowProductList(true);
                    }}
                  >
                    <Icon name="magnify" size={17} color={C.muted} />
                    <Text style={{ flex: 1, fontSize: 14, color: selectedProduct ? C.text : C.muted }} numberOfLines={1}>
                      {selectedProduct ? (selectedProduct.name || selectedProduct.itemName || 'Selected') : (loadingProducts ? 'Loading…' : `Search ${selectedCompany.name} products…`)}
                    </Text>
                    {loadingProducts
                      ? <ActivityIndicator size="small" color={C.red} />
                      : <Icon name="chevron-down" size={17} color={C.muted} />}
                  </Pressable>

                  {/* Product picker Modal — same pattern as SDropdown */}
                  <Modal visible={showProductList} transparent animationType="fade" onRequestClose={() => setShowProductList(false)}>
                    <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} onPress={() => setShowProductList(false)}>
                      <Pressable style={{ backgroundColor: C.white, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 36, maxHeight: '80%' }} onPress={() => {}}>
                        {/* Sheet header */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                          <Text style={{ fontSize: 16, fontWeight: '900', color: C.text }}>Select Product</Text>
                          <Pressable onPress={() => setShowProductList(false)}><Icon name="close" size={20} color={C.text} /></Pressable>
                        </View>
                        {/* Search input inside Modal */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: C.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 8 }}>
                          <Icon name="magnify" size={16} color={C.muted} />
                          <TextInput
                            style={{ flex: 1, fontSize: 14, color: C.text }}
                            value={productSearch}
                            onChangeText={handleProductSearch}
                            placeholder={`Search ${selectedCompany.name} products…`}
                            placeholderTextColor={C.muted}
                            autoFocus
                            returnKeyType="search"
                          />
                          {productSearch.length > 0 && (
                            <Pressable onPress={() => { setProductSearch(''); handleCompanySelect(selectedCompany); }} hitSlop={8}>
                              <Icon name="close-circle" size={15} color={C.muted} />
                            </Pressable>
                          )}
                        </View>
                        {/* Scrollable list */}
                        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                          {products.length === 0 ? (
                            <View style={{ padding: 20, alignItems: 'center' }}>
                              {productSearch.length > 0
                                ? <>
                                    <Icon name="package-variant-closed-remove" size={24} color={C.muted} />
                                    <Text style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>No products match "{productSearch}"</Text>
                                  </>
                                : <Text style={{ fontSize: 13, color: C.muted }}>No items found for {selectedCompany.name}</Text>
                              }
                            </View>
                          ) : (
                            products.map((prod, idx) => {
                              const nm    = prod.name || prod.itemName || '—';
                              const stock = prod.stock ?? prod.qty ?? prod.currentQuantity ?? 0;
                              const price = prod.unitPrice ?? prod.sellingPrice ?? prod.price ?? 0;
                              const isSelected = selectedProduct?.id === prod.id || selectedProduct?._id === prod._id;
                              return (
                                <Pressable
                                  key={String(prod.id || prod._id || idx)}
                                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: isSelected ? '#FFF5F5' : C.white }}
                                  onPress={() => { handleProductSelect(prod); setShowProductList(false); }}>
                                  <View style={{ flex: 1 }}>
                                   <Text style={{ fontSize: 14, fontWeight: '700', color: isSelected ? C.red : C.text }} numberOfLines={2}>{nm}</Text>
                                 </View>
                                  <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '800', color: stock > 0 ? C.green : C.red }}>{stock} {prod.unit || 'pcs'}</Text>
                                    {price > 0 ? <Text style={{ fontSize: 11, color: C.amber, fontWeight: '700' }}>₹{numFmt(price)}</Text> : null}
                                  </View>
                                  {isSelected && <Icon name="check" size={15} color={C.red} style={{ marginLeft: 6 }} />}
                                </Pressable>
                              );
                            })
                          )}
                        </ScrollView>
                      </Pressable>
                    </Pressable>
                  </Modal>
                </>
              )}

              {!selectedCompany && !loadingCompanies && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.amberBg, borderRadius: 10, padding: 12, marginTop: 4 }}>
                  <Icon name="information-outline" size={15} color={C.amber} />
                  <Text style={{ flex: 1, fontSize: 12, color: C.amber, fontWeight: '600' }}>Select a company first to see its products</Text>
                </View>
              )}

              {/* Auto-filled product details — shown after selection */}
              {selectedProduct && (
                <View style={{ backgroundColor: '#F8F9FA', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.line, marginTop: 10 }}>
                  <Text style={{ fontSize: 11, fontWeight: '900', color: C.red, letterSpacing: 0.5, marginBottom: 10 }}>PRODUCT DETAILS (FROM ERP / TALLY)</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF0F0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8 }}>
                    <Icon name="package-variant" size={14} color={C.red} />
                    <Text style={{ flex: 1, fontSize: 13, fontWeight: '800', color: C.text }}>{selectedProduct.name || '—'}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                    {unit ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F3E5F5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 }}>
                        <Icon name="package-up" size={11} color={C.purple} />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: C.purple }}>Unit: {unit}</Text>
                      </View>
                    ) : null}
                    {(() => {
                      const stk = selectedProduct.stock ?? selectedProduct.qty ?? 0;
                      return (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: stk > 0 ? C.greenBg : '#FFF5F5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 }}>
                          <Icon name="warehouse" size={11} color={stk > 0 ? C.green : C.red} />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: stk > 0 ? C.green : C.red }}>Stock: {stk} {unit || 'pcs'}</Text>
                        </View>
                      );
                    })()}
                    {priceN > 0 ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.amberBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 }}>
                        <Icon name="currency-inr" size={11} color={C.amber} />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: C.amber }}>Price: ₹{numFmt(priceN)}</Text>
                      </View>
                    ) : null}
                    {gstN > 0 ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.tealBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 }}>
                        <Icon name="percent" size={11} color={C.teal} />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: C.teal }}>GST: {gstN}%</Text>
                      </View>
                    ) : null}
                    {discN > 0 ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.greenBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 }}>
                        <Icon name="tag-percentage" size={11} color={C.green} />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: C.green }}>Discount: {discN}%</Text>
                      </View>
                    ) : null}
                    {(selectedProduct.moq ?? selectedProduct.minQuantity) ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.navyBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 }}>
                        <Icon name="counter" size={11} color={C.navy} />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: C.navy }}>MOQ: {selectedProduct.moq ?? selectedProduct.minQuantity}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              )}
            </Sec>

            {/* ── Pricing — auto-filled from product, read-only except Quantity ── */}
            <Sec title="Pricing" icon="currency-inr">
              {/* Quantity — editable, pre-filled from MOQ */}
              <Lbl t="QUANTITY *" />
              {selectedProduct && (selectedProduct.moq ?? selectedProduct.minQuantity ?? 0) > 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Icon name="information-outline" size={12} color={C.navy} />
                  <Text style={{ fontSize: 11, color: C.navy, fontWeight: '600' }}>
                    MOQ: {selectedProduct.moq ?? selectedProduct.minQuantity} — auto-filled, you can edit
                  </Text>
                </View>
              ) : null}
              <Inp value={qty} onChangeText={setQty} keyboardType="numeric" placeholder="e.g. 10" />

              {/* Auto-filled price details — read-only display */}
              {selectedProduct ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  {priceN > 0 && (
                    <View style={fm.readBadge}>
                      <Text style={fm.readLbl}>Unit Price</Text>
                      <Text style={fm.readVal}>₹{numFmt(priceN)}</Text>
                    </View>
                  )}
                  {discN > 0 && (
                    <View style={[fm.readBadge, { backgroundColor: C.greenBg }]}>
                      <Text style={[fm.readLbl, { color: C.green }]}>Discount</Text>
                      <Text style={[fm.readVal, { color: C.green }]}>{discN}%</Text>
                    </View>
                  )}
                  {gstN > 0 && (
                    <View style={[fm.readBadge, { backgroundColor: C.tealBg }]}>
                      <Text style={[fm.readLbl, { color: C.teal }]}>GST</Text>
                      <Text style={[fm.readVal, { color: C.teal }]}>{gstN}%</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.amberBg, borderRadius: 8, padding: 10, marginBottom: 10 }}>
                  <Icon name="information-outline" size={13} color={C.amber} />
                  <Text style={{ flex: 1, fontSize: 12, color: C.amber }}>Select a product above to auto-fill price, discount and GST.</Text>
                </View>
              )}

              {/* Live calculation */}
              {hasPrice && (
                <View style={fm.totals}>
                  <View style={fm.totalCol}><Text style={fm.totalLbl}>Sub Total</Text><Text style={fm.totalVal}>₹{numFmt(sub)}</Text></View>
                  <View style={fm.totalSep} />
                  <View style={fm.totalCol}><Text style={fm.totalLbl}>GST</Text><Text style={fm.totalVal}>₹{numFmt(gst)}</Text></View>
                  <View style={fm.totalSep} />
                  <View style={fm.totalCol}><Text style={fm.totalLbl}>Grand Total</Text><Text style={[fm.totalVal, { color: C.red, fontSize: 14 }]}>₹{numFmt(tot)}</Text></View>
                </View>
              )}
            </Sec>
            {/* Order Date — single date picker only */}
            <Sec title="Order Date" icon="calendar-outline">
              <DatePicker label="ORDER DATE" value={orderDate} onChange={setOrderDate} />
            </Sec>

            {/* Delivery Address */}
            <Sec title="Delivery Address" icon="map-marker-outline">
              <Lbl t="ADDRESS" />
              <Inp value={address} onChangeText={setAddress} placeholder="Street / Building" multiline numberOfLines={2} style={{ minHeight: 58, textAlignVertical: 'top' }} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}><Lbl t="CITY" /><Inp value={city} onChangeText={setCity} placeholder="e.g. Mumbai" /></View>
                <View style={{ flex: 1 }}><Lbl t="STATE" /><Inp value={stateName} onChangeText={setStateName} placeholder="e.g. Maharashtra" /></View>
              </View>
              <Lbl t="PINCODE" />
              <Inp value={pincode} onChangeText={setPincode} keyboardType="numeric" placeholder="e.g. 400001" />
            </Sec>

            {/* Priority + Remarks */}
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
  readBadge:   { flexDirection: 'column', alignItems: 'center', backgroundColor: C.amberBg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, minWidth: 80 },
  readLbl:     { fontSize: 10, fontWeight: '700', color: C.amber, marginBottom: 2 },
  readVal:     { fontSize: 14, fontWeight: '900', color: C.amber },
});

// ─── EditOrderModal ───────────────────────────────────────────────────────────
function EditOrderModal({ visible, order, onClose, onSaved }) {
  const [priority, setPriority] = useState('Normal');
  const [notes,    setNotes]    = useState('');
  const [remarks,  setRemarks]  = useState('');
  const [saving,   setSaving]   = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [loadInv,  setLoadInv]  = useState(false);

  useEffect(() => {
    if (!order) return;
    setPriority(order.priority || 'Normal');
    setNotes(order.notes || order.remarks || '');
    setRemarks(order.remarks || order.notes || '');
    if (!apiService) { setInvoices([]); return; }
    const ordId     = order.orderId || order.id || '';
    const mongodbId = order.mongodbId || order._id || '';
    if ((!ordId && !mongodbId) || order._isLocal) { setInvoices([]); return; }

    setLoadInv(true);

    // If invoiceNo is stored on the order, build a minimal invoice item immediately
    if (order.invoiceNo) {
      setInvoices([{
        id:         order.invoiceId || order.invoiceNo,
        invoiceNo:  order.invoiceNo,
        grandTotal: order.value || 0,
        status:     order.status === 'Invoice Generated' ? 'Sent' : 'Pending',
        paymentStatus: 'Pending',
        date:       null,
        items:      order.lineItems?.map(li => ({ description: li.name })) || [],
      }]);
      setLoadInv(false);
      return;
    }

    // Use mongodbId for exact salesOrderId match; fallback to orderId string search
    const params = { limit: 50 };
    if (mongodbId) params.mongodbId = mongodbId;
    else params.orderId = ordId;

    apiService.get('/invoices', params)
      .then(r => {
        const list = (r?.data || []);
        list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        setInvoices(list);
      })
      .catch(() => setInvoices([]))
      .finally(() => setLoadInv(false));
  }, [order]);

  const save = async () => {
    setSaving(true);
    try {
      if (apiService && !order?._isLocal) {
        const id = resolveId(order);
        const res = await apiService.put(`/orders/${id}`, { priority, notes, remarks });
        if (!res?.success) { Alert.alert('Error', res?.message || 'Could not update order.'); setSaving(false); return; }
      }
      onSaved({ ...order, priority, notes, remarks });
      onClose();
    } catch (e) { Alert.alert('Error', e?.message || 'Could not update order.'); }
    finally { setSaving(false); }
  };

  if (!order) return null;
  const st    = ST[order.status] || { c: C.muted, bg: '#F2F2F2' };
  const items = Array.isArray(order.lineItems) && order.lineItems.length > 0 ? order.lineItems : (order.items || []);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={em.overlay}>
        <View style={em.sheet}>
          {/* Header */}
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
            {/* Status + Amount banner */}
            <View style={em.banner}>
              <View style={[em.statusBadge, { backgroundColor: st.bg }]}>
                <View style={[em.statusDot, { backgroundColor: st.c }]} />
                <Text style={[em.statusTxt, { color: st.c }]}>{order.status}</Text>
              </View>
              <Text style={em.amtTxt}>{fmtAmt(order)}</Text>
            </View>

            {/* ── Order Summary (read-only info) ── */}
            <View style={em.section}>
              <View style={em.secHead}>
                <Icon name="information-outline" size={14} color={C.red} />
                <Text style={em.secTitle}>Order Details</Text>
              </View>
              {[
                { icon: 'store-outline',       label: 'Dealer',        val: order.customer || order.customerName },
                { icon: 'phone-outline',        label: 'Mobile',        val: order.mobile },
                { icon: 'tag-outline',          label: 'Category',      val: items[0]?.category || order._categoryName },
                { icon: 'package-variant',      label: 'Product',       val: items[0]?.name },
                { icon: 'counter',              label: 'Qty',           val: items[0]?.quantity ? String(items[0].quantity) : null },
                { icon: 'currency-inr',         label: 'Unit Price',    val: items[0]?.unitPrice ? `₹${numFmt(items[0].unitPrice)}` : null },
                { icon: 'cash-multiple',        label: 'Payment',       val: order.paymentMode },
                { icon: 'map-marker-outline',   label: 'Address',       val: order.deliveryAddress || [order.address, order.city, order.state].filter(Boolean).join(', ') },
                { icon: 'calendar-outline',     label: 'Order Date',    val: fmtDate(order.orderDate || order.createdAt) },
                { icon: 'calendar-check',       label: 'Delivery Date', val: fmtDate(order.expectedDeliveryDate) },
                { icon: 'pound-box-outline',    label: 'PO Number',     val: order.poNumber },
              ].filter(r => r.val && r.val !== '—').map((r, i, arr) => (
                <View key={r.label} style={[em.infoRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={em.infoLeft}>
                    <Icon name={r.icon} size={12} color={C.muted} />
                    <Text style={em.infoLbl}>{r.label}</Text>
                  </View>
                  <Text style={em.infoVal} numberOfLines={2}>{r.val}</Text>
                </View>
              ))}
            </View>

            {/* ── Invoices ── */}
            <View style={em.section}>
              <View style={em.secHead}>
                <Icon name="file-document-outline" size={14} color={C.red} />
                <Text style={em.secTitle}>Invoices ({loadInv ? '…' : invoices.length})</Text>
                {loadInv && <ActivityIndicator size="small" color={C.red} style={{ marginLeft: 6 }} />}
              </View>

              {/* Product name context */}
              {items[0]?.name ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F0F4FF', borderRadius: 7, paddingHorizontal: 9, paddingVertical: 5, marginBottom: 8 }}>
                  <Icon name="package-variant" size={11} color={C.blue} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: C.blue }}>Product: {items[0].name}</Text>
                </View>
              ) : null}

              {order._isLocal ? (
                <View style={em.noInv}>
                  <Icon name="cloud-upload-outline" size={28} color={C.line} />
                  <Text style={em.noInvTxt}>Order not yet synced — place order to generate invoices</Text>
                </View>
              ) : invoices.length === 0 && !loadInv ? (
                <View style={em.noInv}>
                  <Icon name="file-document-remove-outline" size={28} color={C.line} />
                  <Text style={em.noInvTxt}>No invoices found for this order/product</Text>
                </View>
              ) : (
                invoices.map((inv, i) => {
                  const payStatus = inv.status || inv.paymentStatus || 'Pending';
                  const isPaid    = payStatus === 'Paid';
                  const isOverdue = payStatus === 'Overdue';
                  const badgeBg   = isPaid ? C.greenBg : isOverdue ? '#FFF5F5' : C.amberBg;
                  const badgeClr  = isPaid ? C.green   : isOverdue ? C.red     : C.amber;
                  const firstInvItem = inv.items && inv.items.length > 0 ? inv.items[0] : null;
                  return (
                    <View key={inv.id || inv.invoiceNo || i} style={em.invRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={em.invNo}>{inv.invoiceNo || inv.invoiceNumber || inv.number || inv.id || inv._id || `INV-${i + 1}`}</Text>
                        {firstInvItem?.description ? (
                          <Text style={{ fontSize: 10, color: C.blue, fontWeight: '600', marginTop: 1 }} numberOfLines={1}>
                            {firstInvItem.description}{inv.items?.length > 1 ? ` +${inv.items.length - 1}` : ''}
                          </Text>
                        ) : null}
                        <Text style={em.invDate}>{inv.date || fmtDate(inv.createdAt)}</Text>
                        {inv.orderNo ? (
                          <Text style={{ fontSize: 9, color: C.muted, fontWeight: '600' }}>PO: {inv.orderNo}</Text>
                        ) : null}
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={em.invAmt}>{inv.grandTotal ? `₹${numFmt(inv.grandTotal)}` : (inv.amount || '—')}</Text>
                        {inv.remaining > 0 && !isPaid ? (
                          <Text style={{ fontSize: 9, color: C.red, fontWeight: '700' }}>Due: ₹{numFmt(inv.remaining)}</Text>
                        ) : null}
                        <View style={[em.invBadge, { backgroundColor: badgeBg }]}>
                          <Text style={[em.invBadgeTxt, { color: badgeClr }]}>{payStatus}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            {/* ── Editable fields ── */}
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
              <Text style={em.lbl}>NOTES / REMARKS</Text>
              <TextInput style={em.notesIn} value={notes} onChangeText={v => { setNotes(v); setRemarks(v); }}
                placeholder="Add notes or instructions…" placeholderTextColor={C.muted}
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
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' },
  hdr:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14, backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomWidth: 1, borderBottomColor: C.line },
  hdrIcon:    { width: 32, height: 32, borderRadius: 9, backgroundColor: '#E3F0FF', alignItems: 'center', justifyContent: 'center' },
  hdrTitle:   { fontSize: 16, fontWeight: '900', color: C.text },
  hdrSub:     { fontSize: 11, fontWeight: '700', color: C.muted },
  closeBtn:   { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F2F2F2', alignItems: 'center', justifyContent: 'center' },
  banner:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  statusBadge:{ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  statusDot:  { width: 6, height: 6, borderRadius: 3 },
  statusTxt:  { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  amtTxt:     { fontSize: 18, fontWeight: '900', color: C.red },
  section:    { backgroundColor: C.white, borderRadius: 14, marginHorizontal: 12, marginBottom: 10, padding: 14, borderWidth: 1, borderColor: C.line },
  secHead:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  secTitle:   { fontSize: 12, fontWeight: '900', color: C.red, letterSpacing: 0.5, textTransform: 'uppercase' },
  infoRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.line },
  infoLeft:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoLbl:    { fontSize: 11, fontWeight: '700', color: C.muted },
  infoVal:    { fontSize: 12, fontWeight: '700', color: C.text, flexShrink: 1, textAlign: 'right', maxWidth: '55%' },
  noInv:      { alignItems: 'center', paddingVertical: 18, gap: 6 },
  noInvTxt:   { fontSize: 12, color: C.muted, fontWeight: '600', textAlign: 'center' },
  invRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  invNo:      { fontSize: 13, fontWeight: '800', color: C.text },
  invDate:    { fontSize: 11, color: C.muted, marginTop: 2 },
  invAmt:     { fontSize: 13, fontWeight: '800', color: C.text },
  invBadge:   { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginTop: 3 },
  invBadgeTxt:{ fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  lbl:        { fontSize: 11, fontWeight: '800', color: C.muted, letterSpacing: 0.5, marginBottom: 6 },
  chip:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: C.line, backgroundColor: '#F8F8F8' },
  chipOn:     { backgroundColor: C.red, borderColor: C.red },
  chipTxt:    { fontSize: 12, fontWeight: '700', color: C.sub },
  chipTxtOn:  { color: C.white, fontWeight: '900' },
  notesIn:    { borderWidth: 1.5, borderColor: C.line, borderRadius: 10, padding: 12, fontSize: 14, color: C.text, minHeight: 90, marginBottom: 4 },
  cancelBtn:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.white },
  cancelTxt:  { fontSize: 14, fontWeight: '700', color: C.sub },
  saveBtn:    { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.red, borderRadius: 12, paddingVertical: 13 },
  saveBtnDim: { backgroundColor: '#B0BEC5' },
  saveTxt:    { color: C.white, fontSize: 14, fontWeight: '900' },
});

// ─── ViewOrderModal — shows order details + invoice count + invoice list ──────
function ViewOrderModal({ visible, order, onClose }) {
  const [invoices, setInvoices] = useState([]);
  const [loadInv,  setLoadInv]  = useState(false);

  useEffect(() => {
    if (!order || !visible) return;
    const ordId     = order.orderId || order.id || '';
    const mongodbId = order.mongodbId || order._id || '';
    if ((!ordId && !mongodbId) || order._isLocal || !apiService) { setInvoices([]); return; }

    setLoadInv(true);

    // If invoiceNo is stored on the order, show it immediately without an API call
    if (order.invoiceNo) {
      setInvoices([{
        id:         order.invoiceId || order.invoiceNo,
        invoiceNo:  order.invoiceNo,
        grandTotal: order.value || 0,
        status:     'Sent',
        paymentStatus: 'Pending',
        date:       null,
        items:      order.lineItems?.map(li => ({ description: li.name })) || [],
      }]);
      setLoadInv(false);
      return;
    }

    // Use mongodbId for exact salesOrderId match; fallback to orderId string search
    const params = { limit: 50 };
    if (mongodbId) params.mongodbId = mongodbId;
    else params.orderId = ordId;

    apiService.get('/invoices', params)
      .then(r => {
        const list = (r?.data || []);
        list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        setInvoices(list);
      })
      .catch(() => setInvoices([]))
      .finally(() => setLoadInv(false));
  }, [order, visible]);

  if (!order) return null;
  const items = Array.isArray(order.lineItems) && order.lineItems.length > 0 ? order.lineItems : (order.items || []);
  const st = ST[order.status] || { c: C.muted, bg: '#F2F2F2' };
  const categoryName = items[0]?.category || order._categoryName || order.category || '—';
  const productName  = items[0]?.name || items[0]?.itemName || '—';
  const skuVal       = items[0]?.sku || '—';
  const packSize     = items[0]?.packSize || order._packSize || items[0]?.unit || '—';

  const infoRows = [
    { icon: 'receipt',           label: 'Order ID',     val: order.orderId || order.id || '—' },
    { icon: 'store-outline',     label: 'Dealer',       val: order.customer || order.customerName || '—' },
    { icon: 'office-building',   label: 'Company',      val: order.company || order._vendorName || '—' },
    { icon: 'tag-outline',       label: 'Category',     val: categoryName },
    { icon: 'package-variant',   label: 'Product',      val: productName },
    { icon: 'barcode',           label: 'SKU',          val: skuVal },
    { icon: 'package-up',        label: 'Unit',         val: packSize },
    { icon: 'counter',           label: 'Quantity',     val: items[0]?.quantity ? String(items[0].quantity) : '—' },
    { icon: 'currency-inr',      label: 'Unit Price',   val: items[0]?.unitPrice ? `₹${numFmt(items[0].unitPrice)}` : '—' },
    { icon: 'tag-percentage',    label: 'Discount',     val: items[0]?.discount ? `${items[0].discount}%` : '—' },
    { icon: 'percent',           label: 'GST',          val: items[0]?.gstPercent ? `${items[0].gstPercent}%` : '—' },
    { icon: 'file-document-multiple-outline', label: 'Invoices', val: !order._isLocal ? `${invoices.length} invoice${invoices.length !== 1 ? 's' : ''}` : 'Not synced' },
    { icon: 'cash-multiple',     label: 'Payment Mode', val: order.paymentMode || '—' },
    { icon: 'calendar-outline',  label: 'Order Date',   val: fmtDate(order.orderDate || order.createdAt) },
    { icon: 'priority-high',     label: 'Priority',     val: order.priority || 'Normal' },
  ].filter(r => r.val && r.val !== '—' && r.val !== 'null');

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
            {/* Status + Amount */}
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
            {/* Financial strip */}
            <View style={vm.finRow}>
              <View style={vm.finItem}><Text style={vm.finLbl}>Sub Total</Text><Text style={vm.finVal}>₹{numFmt(order.subTotal)}</Text></View>
              <View style={vm.finSep} />
              <View style={vm.finItem}><Text style={vm.finLbl}>GST</Text><Text style={vm.finVal}>₹{numFmt(order.totalGst)}</Text></View>
              <View style={vm.finSep} />
              <View style={vm.finItem}><Text style={vm.finLbl}>Total</Text><Text style={[vm.finVal, { color: C.red }]}>₹{numFmt(order.value || 0)}</Text></View>
            </View>
            {/* Info rows */}
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
            {/* Remarks */}
            {(order.remarks || order.notes) ? (
              <View style={vm.remarksBox}>
                <Text style={vm.remarksLbl}>Remarks / Notes</Text>
                <Text style={vm.remarksTxt}>{order.remarks || order.notes}</Text>
              </View>
            ) : null}
            {/* ── Invoices section — shows count + full list with product name ── */}
            <View style={vm.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <Icon name="file-document-multiple-outline" size={14} color={C.red} />
                <Text style={vm.sectionTitle}>
                  Invoices {loadInv ? '(loading…)' : `(${invoices.length})`}
                </Text>
                {loadInv && <ActivityIndicator size="small" color={C.red} style={{ marginLeft: 4 }} />}
              </View>

              {/* Product name context */}
              {productName && productName !== '—' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F0F4FF', borderRadius: 7, paddingHorizontal: 9, paddingVertical: 5, marginBottom: 10 }}>
                  <Icon name="package-variant" size={11} color={C.blue} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: C.blue }}>Product: {productName}</Text>
                </View>
              ) : null}

              {order._isLocal ? (
                <View style={vm.noInv}>
                  <Icon name="cloud-upload-outline" size={26} color={C.line} />
                  <Text style={vm.noInvTxt}>Order not synced yet — no invoices available</Text>
                </View>
              ) : invoices.length === 0 && !loadInv ? (
                <View style={vm.noInv}>
                  <Icon name="file-document-remove-outline" size={26} color={C.line} />
                  <Text style={vm.noInvTxt}>No invoices found for this order/product</Text>
                </View>
              ) : (
                invoices.map((inv, i) => {
                  const payStatus = inv.status || inv.paymentStatus || 'Pending';
                  const isPaid    = payStatus === 'Paid';
                  const isOverdue = payStatus === 'Overdue';
                  const badgeBg   = isPaid ? C.greenBg : isOverdue ? '#FFF5F5' : C.amberBg;
                  const badgeClr  = isPaid ? C.green   : isOverdue ? C.red     : C.amber;
                  const firstInvItem = inv.items && inv.items.length > 0 ? inv.items[0] : null;
                  return (
                    <View key={inv.id || inv.invoiceNo || i} style={[vm.invRow, i === invoices.length - 1 && { borderBottomWidth: 0 }]}>
                      <View style={vm.invIcon}><Icon name="file-document-outline" size={14} color={C.blue} /></View>
                      <View style={{ flex: 1 }}>
                        <Text style={vm.invNo}>{inv.invoiceNo || inv.invoiceNumber || inv.number || inv.id || inv._id || `INV-${i + 1}`}</Text>
                        {firstInvItem?.description ? (
                          <Text style={{ fontSize: 10, color: C.blue, fontWeight: '600', marginTop: 1 }} numberOfLines={1}>
                            {firstInvItem.description}{inv.items?.length > 1 ? ` +${inv.items.length - 1} more` : ''}
                          </Text>
                        ) : null}
                        <Text style={vm.invDate}>{inv.date || fmtDate(inv.createdAt)}</Text>
                        {inv.orderNo ? (
                          <Text style={{ fontSize: 9, color: C.muted, fontWeight: '600' }}>PO: {inv.orderNo}</Text>
                        ) : null}
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Text style={vm.invAmt}>{inv.grandTotal ? `₹${numFmt(inv.grandTotal)}` : (inv.amount || '—')}</Text>
                        {inv.remaining > 0 && !isPaid ? (
                          <Text style={{ fontSize: 9, color: C.red, fontWeight: '700' }}>Due: ₹{numFmt(inv.remaining)}</Text>
                        ) : null}
                        <View style={[vm.invBadge, { backgroundColor: badgeBg }]}>
                          <Text style={[vm.invBadgeTxt, { color: badgeClr }]}>{payStatus}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
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
  sectionTitle:{ fontSize: 12, fontWeight: '900', color: C.red, letterSpacing: 0.5 },
  noInv:       { alignItems: 'center', paddingVertical: 16, gap: 6 },
  noInvTxt:    { fontSize: 12, color: C.muted, fontWeight: '600', textAlign: 'center' },
  invRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line, gap: 10 },
  invIcon:     { width: 28, height: 28, borderRadius: 7, backgroundColor: C.blueBg, alignItems: 'center', justifyContent: 'center' },
  invNo:       { fontSize: 13, fontWeight: '800', color: C.text },
  invDate:     { fontSize: 11, color: C.muted, marginTop: 1 },
  invAmt:      { fontSize: 13, fontWeight: '800', color: C.text },
  invBadge:    { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  invBadgeTxt: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
});

// ─── InvoiceCountInline — shows invoice count as small badge inside card ─────
// Uses mongodbId (salesOrderId) for accurate per-order invoice lookup
function InvoiceCountInline({ order }) {
  const [count, setCount] = useState(null);
  useEffect(() => {
    if (!order || !apiService || order._isLocal) return;
    const orderId   = order.orderId || order.id || '';
    const mongodbId = order.mongodbId || order._id || '';
    if (!orderId && !mongodbId) return;

    // Build query params — mongodbId gives exact salesOrderId match
    const params = { limit: 50 };
    if (mongodbId) params.mongodbId = mongodbId;
    else params.orderId = orderId;

    apiService.get('/invoices', params)
      .then(r => {
        const list = r?.data || [];
        setCount(list.length > 0 ? list.length : null);
      })
      .catch(() => setCount(null));
  }, [order]);
  if (!count) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: C.blueBg, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 }}>
      <Icon name="file-document-outline" size={10} color={C.blue} />
      <Text style={{ fontSize: 10, fontWeight: '800', color: C.blue }}>{count} inv</Text>
    </View>
  );
}

// ─── InvoiceCountBadge — small badge on View button showing invoice count ────
function InvoiceCountBadge({ orderId }) {
  const [count, setCount] = useState(null);
  useEffect(() => {
    if (!orderId || !apiService) return;
    apiService.get('/invoices', { orderId, limit: 50 })
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

// ─── OrderCard — 5 action buttons: Track, Place Order, View, Edit, PDF ───────
function OrderCard({ order, onTrack, onEdit, onDelete, onPlaceOrder, onView, onDownloadPdf }) {
  const st       = ST[order.status] || { c: C.muted, bg: '#F2F2F2' };
  const canEdit  = EDITABLE.includes(order.status);
  const canPlace = PLACEABLE.includes(order.status);
  const orderId  = order.orderId || order.id || '—';
  const items    = Array.isArray(order.lineItems) && order.lineItems.length > 0 ? order.lineItems : (order.items || []);
  const firstItem = items[0];
  const totalAmt  = order.value || order.totalAmount;

  // Inline invoice state for this card
  const [invoiceInfo, setInvoiceInfo] = useState(null);
  useEffect(() => {
    // If invoiceNo is already on the order (written back from ERP), use it directly
    if (order.invoiceNo) {
      setInvoiceInfo({
        count:     1,
        invoiceNo: order.invoiceNo,
        amount:    order.value || 0,
      });
      return;
    }
    if (!order || !apiService || order._isLocal) return;
    const mongodbId = order.mongodbId || order._id || '';
    const oid       = order.orderId || order.id || '';
    if (!mongodbId && !oid) return;
    const params = { limit: 10 };
    if (mongodbId) params.mongodbId = mongodbId;
    else params.orderId = oid;
    apiService.get('/invoices', params)
      .then(r => {
        const list = r?.data || [];
        if (list.length > 0) {
          setInvoiceInfo({ count: list.length, invoiceNo: list[0].invoiceNo || list[0].id, amount: list[0].grandTotal });
        }
      })
      .catch(() => {});
  }, [order]);

  return (
    <View style={[oc.card, { borderLeftWidth: 3, borderLeftColor: st.c }]}>

      {/* ── Top: Order ID + Status ── */}
      <View style={oc.topRow}>
        <View style={{ flex: 1 }}>
          <View style={oc.idRow}>
            <View style={oc.idIconWrap}>
              <Icon name="receipt" size={11} color={C.red} />
            </View>
            <Text style={oc.idTxt} numberOfLines={1}>{orderId}</Text>
            {order._isLocal && (
              <View style={oc.localChip}>
                <Text style={oc.localTxt}>LOCAL</Text>
              </View>
            )}
          </View>
          <Text style={oc.dateTxt}>
            {fmtDate(order.createdAt || order.orderDate)}
          </Text>
        </View>
        <View style={[oc.statusBadge, { backgroundColor: st.bg, borderColor: st.c + '40' }]}>
          <View style={[oc.statusDot, { backgroundColor: st.c }]} />
          <Text style={[oc.statusTxt, { color: st.c }]}>{order.status || 'Unknown'}</Text>
        </View>
      </View>

      {/* ── Invoice info banner ── */}
      {invoiceInfo ? (
        <View style={oc.invBanner}>
          <Icon name="file-document-check" size={13} color={C.green} />
          <Text style={oc.invBannerNo} numberOfLines={1}>{invoiceInfo.invoiceNo}</Text>
          {invoiceInfo.amount > 0 && (
            <Text style={oc.invBannerAmt}>₹{numFmt(invoiceInfo.amount)}</Text>
          )}
          {invoiceInfo.count > 1 && (
            <View style={oc.invCountChip}>
              <Text style={oc.invCountTxt}>+{invoiceInfo.count - 1} more</Text>
            </View>
          )}
        </View>
      ) : null}

      {/* ── Dealer name + mobile ── */}
      {(order.customer || order.customerName) ? (
        <View style={oc.dealerRow}>
          <Icon name="store-outline" size={12} color={C.blue} />
          <Text style={oc.dealerName} numberOfLines={1}>{order.customer || order.customerName}</Text>
          {order.mobile ? (
            <>
              <Text style={oc.dealerSep}>·</Text>
              <Icon name="phone-outline" size={11} color={C.muted} />
              <Text style={oc.dealerMobile}>{order.mobile}</Text>
            </>
          ) : null}
        </View>
      ) : null}

      <View style={oc.div} />

      {/* ── Product info ── */}
      {firstItem && (
        <View style={oc.productRow}>
          <View style={oc.productIcon}>
            <Icon name="package-variant" size={17} color={C.red} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={oc.productName} numberOfLines={1}>{firstItem.name || '—'}</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
              {firstItem.category ? (
                <View style={oc.microChip}>
                  <Icon name="tag-outline" size={9} color={C.muted} />
                  <Text style={oc.microChipTxt}>{firstItem.category}</Text>
                </View>
              ) : null}
              {firstItem.quantity ? (
                <View style={oc.microChip}>
                  <Icon name="cube-outline" size={9} color={C.muted} />
                  <Text style={oc.microChipTxt}>Qty {firstItem.quantity}{firstItem.packSize ? ` ${firstItem.packSize}` : ''}</Text>
                </View>
              ) : null}
              {firstItem.sku ? (
                <View style={oc.microChip}>
                  <Text style={oc.microChipTxt}>SKU: {firstItem.sku}</Text>
                </View>
              ) : null}
              {firstItem.unitPrice > 0 ? (
                <View style={[oc.microChip, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                  <Text style={[oc.microChipTxt, { color: C.amber, fontWeight: '800' }]}>₹{numFmt(firstItem.unitPrice)}/unit</Text>
                </View>
              ) : null}
            </View>
          </View>
          {totalAmt != null && (
            <View style={oc.amtBox}>
              <Text style={oc.amt}>₹{numFmt(totalAmt)}</Text>
              <Text style={oc.amtLbl}>Total</Text>
            </View>
          )}
        </View>
      )}

      {/* ── Financial chips + priority ── */}
      {(order.subTotal > 0 || order.totalGst > 0 || order.paymentMode || (order.priority && order.priority !== 'Normal')) && (
        <View style={oc.finChips}>
          {order.subTotal > 0 && (
            <View style={oc.finChip}>
              <Text style={oc.finChipLbl}>Sub</Text>
              <Text style={oc.finChipVal}>₹{numFmt(order.subTotal)}</Text>
            </View>
          )}
          {order.totalGst > 0 && (
            <View style={oc.finChip}>
              <Text style={oc.finChipLbl}>GST</Text>
              <Text style={oc.finChipVal}>₹{numFmt(order.totalGst)}</Text>
            </View>
          )}
          {order.paymentMode ? (
            <View style={[oc.finChip, { backgroundColor: '#DCFCE7', borderColor: '#A5D6B0' }]}>
              <Icon name="cash" size={9} color={C.green} />
              <Text style={[oc.finChipVal, { color: C.green }]}>{order.paymentMode}</Text>
            </View>
          ) : null}
          {order.priority && order.priority !== 'Normal' && (
            <View style={[oc.finChip, {
              backgroundColor: order.priority === 'Urgent' ? '#FFF1F2' : C.amberBg,
              borderColor: order.priority === 'Urgent' ? '#FECDD3' : '#FDE68A',
            }]}>
              <Icon name="flag" size={9} color={order.priority === 'Urgent' ? C.red : C.amber} />
              <Text style={[oc.finChipVal, { color: order.priority === 'Urgent' ? C.red : C.amber }]}>{order.priority}</Text>
            </View>
          )}
        </View>
      )}

      {/* ── Action buttons ── */}
      <View style={oc.actRow}>
        <Pressable style={[oc.actBtn, oc.actBtnTrack]}
          onPress={() => onTrack && onTrack(orderId, order)}>
          <Icon name="map-marker-path" size={13} color="#7C3AED" />
          <Text style={[oc.actTxt, { color: '#7C3AED' }]}>Track</Text>
        </Pressable>
        <Pressable style={[oc.actBtn, oc.actBtnView]}
          onPress={() => onView && onView(order)}>
          <Icon name="eye-outline" size={13} color={C.blue} />
          <Text style={[oc.actTxt, { color: C.blue }]}>View</Text>
        </Pressable>
        <Pressable style={[oc.actBtn, canEdit ? oc.actBtnEdit : oc.actBtnDis]}
          onPress={() => canEdit && onEdit && onEdit(order)}
          disabled={!canEdit}>
          <Icon name="pencil-outline" size={13} color={canEdit ? '#0369A1' : C.muted} />
          <Text style={[oc.actTxt, { color: canEdit ? '#0369A1' : C.muted }]}>Edit</Text>
        </Pressable>
        <Pressable style={[oc.actBtn, oc.actBtnPdf]}
          onPress={() => onDownloadPdf && onDownloadPdf(order)}>
          <Icon name="file-pdf-box" size={13} color="#16A34A" />
          <Text style={[oc.actTxt, { color: '#16A34A' }]}>PDF</Text>
        </Pressable>
        <Pressable style={[oc.actBtn, canPlace ? oc.actBtnPlace : oc.actBtnDis]}
          onPress={() => canPlace && onPlaceOrder && onPlaceOrder(order)}
          disabled={!canPlace}>
          <Icon name="send-outline" size={13} color={canPlace ? C.red : C.muted} />
          <Text style={[oc.actTxt, { color: canPlace ? C.red : C.muted }]}>Place</Text>
        </Pressable>
      </View>

      {/* ── Cancel + Delete row ── */}
      {(['Order Placed', 'Pending Approval', 'Cancelled'].includes(order.status)) && (
        <View style={oc.dangerRow}>
          {['Order Placed', 'Pending Approval'].includes(order.status) && (
            <Pressable
              style={oc.cancelBtn}
              onPress={() => {
                Alert.alert(
                  'Cancel Order',
                  `Cancel order ${orderId}?`,
                  [
                    { text: 'No', style: 'cancel' },
                    {
                      text: 'Yes, Cancel',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          const id = order.mongodbId || order._id || orderId;
                          await apiService.post(`/orders/${id}/cancel`, { reason: 'Cancelled by dealer' });
                          onDelete && onDelete(order, 'cancel');
                        } catch (e) {
                          Alert.alert('Error', e?.message || 'Failed to cancel order');
                        }
                      },
                    },
                  ]
                );
              }}>
              <Icon name="close-circle-outline" size={14} color={C.red} />
              <Text style={oc.cancelTxt}>Cancel Order</Text>
            </Pressable>
          )}
          <Pressable
            style={oc.deleteBtn}
            onPress={() => {
              Alert.alert(
                'Delete Order',
                `Permanently delete order ${orderId}? This cannot be undone.`,
                [
                  { text: 'No', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        const id = order.mongodbId || order._id || orderId;
                        await apiService.delete(`/orders/${id}`);
                        onDelete && onDelete(order, 'delete');
                      } catch (e) {
                        Alert.alert('Error', e?.message || 'Failed to delete order');
                      }
                    },
                  },
                ]
              );
            }}>
            <Icon name="trash-can-outline" size={14} color="#FFF" />
            <Text style={oc.deleteTxt}>Delete</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const oc = StyleSheet.create({
  // Card — white with status-coloured left accent border
  card:        { backgroundColor: C.white, borderRadius: 16, borderWidth: 1, borderColor: '#EEF0F5', padding: 14, marginBottom: 12, ...sh2, overflow: 'hidden' },

  // Header row
  topRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  idRow:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  idIconWrap:  { width: 22, height: 22, borderRadius: 6, backgroundColor: '#FFF1F2', alignItems: 'center', justifyContent: 'center' },
  idTxt:       { fontSize: 13, fontWeight: '900', color: C.text, flex: 1, letterSpacing: 0.2 },
  localChip:   { backgroundColor: '#FEF3C7', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#FDE68A' },
  localTxt:    { fontSize: 8, fontWeight: '900', color: '#B45309' },
  dateTxt:     { fontSize: 10, color: C.muted, fontWeight: '600', marginLeft: 28 },

  // Status badge
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, flexShrink: 0, borderWidth: 1 },
  statusDot:   { width: 6, height: 6, borderRadius: 3 },
  statusTxt:   { fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Invoice banner
  invBanner:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F0FDF4', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 8, borderWidth: 1, borderColor: '#A5D6B0' },
  invBannerNo: { flex: 1, fontSize: 12, fontWeight: '800', color: '#15803D' },
  invBannerAmt:{ fontSize: 12, fontWeight: '900', color: '#15803D' },
  invCountChip:{ backgroundColor: '#fff', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1, borderColor: '#A5D6B0' },
  invCountTxt: { fontSize: 9, fontWeight: '800', color: '#15803D' },

  // Dealer row
  dealerRow:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10, backgroundColor: '#EFF6FF', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: '#BFDBFE' },
  dealerName:  { fontSize: 12, fontWeight: '800', color: '#1D4ED8', flex: 1 },
  dealerSep:   { color: C.muted, fontSize: 12 },
  dealerMobile:{ fontSize: 11, fontWeight: '600', color: C.muted },

  // Divider
  div:         { height: 1, backgroundColor: '#F1F5F9', marginBottom: 10 },

  // Product row
  productRow:  { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FAFBFC', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#EEF0F5', gap: 10 },
  productIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFF1F2', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  productName: { fontSize: 13, fontWeight: '800', color: C.text, marginBottom: 2 },
  microChip:   { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F3F4F6', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3, borderWidth: 1, borderColor: '#E5E7EB' },
  microChipTxt:{ fontSize: 9, fontWeight: '700', color: C.muted },
  amtBox:      { alignItems: 'flex-end', flexShrink: 0, marginLeft: 4 },
  amt:         { fontSize: 15, fontWeight: '900', color: C.red },
  amtLbl:      { fontSize: 9, fontWeight: '700', color: C.muted, marginTop: 2, textAlign: 'right' },

  // Financial chips
  finChips:    { flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  finChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F8F9FA', borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#E9ECEF' },
  finChipLbl:  { fontSize: 9, color: C.muted, fontWeight: '700' },
  finChipVal:  { fontSize: 10, fontWeight: '800', color: C.sub },

  // Action row — outlined ghost buttons
  actRow:      { flexDirection: 'row', alignItems: 'center', marginTop: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 6 },
  actBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 9, borderWidth: 1.5 },
  actBtnTrack: { backgroundColor: '#FAF5FF', borderColor: '#DDD6FE' },
  actBtnView:  { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  actBtnEdit:  { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' },
  actBtnPdf:   { backgroundColor: '#F0FDF4', borderColor: '#A5D6B0' },
  actBtnPlace: { backgroundColor: '#FFF1F2', borderColor: '#FECDD3' },
  actBtnDis:   { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' },
  actTxt:      { fontSize: 10, fontWeight: '800', textAlign: 'center' },

  // Danger row
  dangerRow:   { flexDirection: 'row', gap: 8, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#FEE2E2' },
  cancelBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 9, borderWidth: 1.5, borderColor: '#FECDD3', backgroundColor: '#FFF1F2' },
  cancelTxt:   { color: C.red, fontSize: 11, fontWeight: '800' },
  deleteBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, paddingHorizontal: 18, borderRadius: 9, backgroundColor: '#EF4444' },
  deleteTxt:   { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function OrderManagementSection({ onBack, onNavigateToDispatch, onPlaceOrder, onViewInvoice, dealer, initialOrders }) {
  const [orders,       setOrders]       = useState(Array.isArray(initialOrders) ? initialOrders : []);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [search,       setSearch]       = useState('');
  const [showCreate,   setShowCreate]   = useState(false);
  const [editOrder,    setEditOrder]    = useState(null);
  const [viewOrder,    setViewOrder]    = useState(null);

  // ── Persist orders to AsyncStorage so they survive reload ────────────────
  const persistOrders = useCallback(async (list) => {
    if (!AsyncStorage) return;
    try {
      // Only persist local orders (backend orders reload from API)
      const localOrders = list.filter(o => o._isLocal);
      await AsyncStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(localOrders));
    } catch (_) {}
  }, []);

  // ── Load persisted local orders on mount ─────────────────────────────────
  // NOTE: Disabled — orders should not pre-populate from local storage.
  // All orders are fetched fresh from the backend on every load.
  // useEffect(() => { ... }, []);

  // Derived: filter orders locally by search + active status tab
  const filteredOrders = React.useMemo(() => {
    let list = orders;
    if (activeFilter !== 'All') {
      list = list.filter(o => o.status === activeFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(o =>
        (o.orderId || o.id || '').toLowerCase().includes(q) ||
        (o.customer || o.customerName || '').toLowerCase().includes(q) ||
        (o._categoryName || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, activeFilter, search]);

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      if (!apiService) { setLoading(false); setRefreshing(false); return; }
      const res = await apiService.get('/orders', {
        ...(activeFilter !== 'All' && { status: activeFilter }),
        limit: 100,
      });
      if (res?.success) {
        // Backend now strictly filters by dealerId — only this dealer's orders come back.
        // Keep only DealerApp-sourced orders as an extra safety guard.
        const fetched = (res.data || []).filter(o => !o.source || o.source === 'DealerApp');
        setOrders(prev => {
          const apiIds = new Set(fetched.map(o => o.orderId || o.id).filter(Boolean));
          // Keep local orders that haven't been confirmed by API yet
          const localOnly = prev.filter(o => o._isLocal && !apiIds.has(o.orderId || o.id));
          const seen = new Set();
          const merged = [];
          for (const o of [...localOnly, ...fetched]) {
            const key = o.orderId || o.id;
            if (!key || !seen.has(key)) { seen.add(key); merged.push(o); }
          }
          persistOrders(merged);
          return merged;
        });
      }
    } catch (_err) {
      // API unreachable — local orders remain visible from AsyncStorage
    } finally { setLoading(false); setRefreshing(false); }
  }, [activeFilter, persistOrders]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  const onRefresh = () => { setRefreshing(true); fetchOrders(true); };

  const handleTrack = (orderId, order) => {
    if (onNavigateToDispatch) {
      // Navigate to Dispatch & Tracking page with this order's data
      onNavigateToDispatch(orderId, order);
    }
    // No fallback alert — Track button always goes to Dispatch & Tracking
  };

  const handlePlaceOrder = async (order) => {
    try {
      // First update locally for immediate feedback
      setOrders(prev => prev.map(o => 
        (o.orderId || o.id) === (order.orderId || order.id) 
          ? { ...o, status: 'Pending Approval' } 
          : o
      ));

      // Then call the API to place the order
      if (apiService && !order._isLocal) {
        const id = resolveId(order);
        try {
          // Try with the place endpoint first
          await apiService.post(`/orders/${id}/place`, {});
        } catch (placeErr) {
          // Fall back to simple status update
          await apiService.put(`/orders/${id}`, { status: 'Pending Approval' });
        }
      }
      
      Alert.alert('Success', 'Order placed successfully!');
    } catch (err) {
      // Revert on error
      setOrders(prev => prev.map(o => 
        (o.orderId || o.id) === (order.orderId || order.id) 
          ? { ...o, status: order.status } 
          : o
      ));
      Alert.alert('Error', 'Failed to place order. Please try again.');
    }
  };

  const handleViewInvoice = (order) => {
    if (onViewInvoice) {
      onViewInvoice(order);
    } else {
      Alert.alert('Invoices', `Viewing invoices for order ${order?.orderId || order?.id || '—'}`);
    }
  };

  const handleDelete = (order, action = 'delete') => {
    // Remove from local list immediately
    const removeOrder = () => {
      setOrders(prev => {
        const orderId = order.orderId || order.id;
        const next = prev.filter(o => (o.orderId || o.id) !== orderId && o.mongodbId !== order.mongodbId);
        persistOrders(next);
        return next;
      });
    };

    if (action === 'cancel') {
      // Already confirmed inside OrderCard — just update status in local list
      setOrders(prev => {
        const next = prev.map(o => {
          const matches = (o.orderId || o.id) === (order.orderId || order.id) || o.mongodbId === order.mongodbId;
          return matches ? { ...o, status: 'Cancelled' } : o;
        });
        persistOrders(next);
        return next;
      });
    } else {
      // Delete — already confirmed inside OrderCard
      removeOrder();
    }
  };

  const handleEditSaved = (updated) => {
    setOrders(prev => {
      const next = prev.map(o =>
        (o.orderId || o.id) === (updated.orderId || updated.id) ? { ...o, ...updated } : o
      );
      persistOrders(next);
      return next;
    });
  };

  const handleCreated = (newOrder) => {
    if (!newOrder) return;
    const shaped = {
      mongodbId:            newOrder.mongodbId  || newOrder._id || newOrder.id,
      orderId:              newOrder.orderId    || newOrder.id,
      id:                   newOrder.orderId    || newOrder.id,
      customer:             newOrder.customer   || newOrder.customerName || '',
      customerName:         newOrder.customerName || newOrder.customer || '',
      mobile:               newOrder.mobile     || '',
      email:                newOrder.email      || '',
      company:              newOrder.company    || '',
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
      _vendorName:          newOrder._vendorName   || newOrder.customer || '',
      _packSize:            newOrder._packSize     || '',
      _isLocal:             newOrder._isLocal ?? true,
    };
    setOrders(prev => {
      const next = [shaped, ...prev];
      persistOrders(next);
      return next;
    });
  };

  const handleDownloadPdf = o => Alert.alert('Download PDF', `PDF for ${o.orderId || o.id} will be saved to your device.`);

  return (
    <SafeAreaView style={pg.screen} edges={['top']}>

      {/* ── Navbar — gradient header ── */}
      <NavGradient style={pg.navbar}>
        <Pressable onPress={onBack} style={pg.backBtn}>
          <Icon name="arrow-left" size={22} color={C.white} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={pg.navTitle}>My Orders</Text>
          {orders.length > 0 && (
            <Text style={pg.navSub}>{orders.length} total</Text>
          )}
        </View>
        <Pressable onPress={() => setShowCreate(true)} style={pg.createPill}>
          <Icon name="plus" size={15} color={C.red} />
          <Text style={pg.createTxt}>Create</Text>
        </Pressable>
      </NavGradient>

      {/* ── Search ── */}
      <View style={pg.searchWrap}>
        <View style={pg.searchIconWrap}>
          <Icon name="magnify" size={17} color={C.muted} />
        </View>
        <TextInput style={pg.searchIn} placeholder="Search by order ID, customer…"
          placeholderTextColor={C.muted} value={search} onChangeText={setSearch}
          returnKeyType="search" />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} style={{ padding: 2 }}>
            <Icon name="close-circle" size={17} color={C.muted} />
          </Pressable>
        )}
      </View>

      {/* ── Status filter — pill tabs (Swiggy/Amazon style) ── */}
      <View style={pg.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={pg.filterRow}>
          {QUICK_FILTERS.map(f => {
            const meta  = STATUS_META[f] || { icon: 'circle-outline', color: '#64748B' };
            const isOn  = activeFilter === f;
            const count = f === 'All'
              ? orders.length
              : orders.filter(o => o.status === f).length;
            return (
              <Pressable
                key={f}
                onPress={() => setActiveFilter(f)}
                style={[pg.pill, isOn && { backgroundColor: meta.color, borderColor: meta.color }]}>
                {/* coloured dot — inactive only */}
                {!isOn && <View style={[pg.pillDot, { backgroundColor: meta.color }]} />}
                <Text style={[pg.pillTxt, { color: isOn ? '#fff' : C.text }]}>
                  {f === 'Pending Approval' ? 'Pending' : f}
                </Text>
                {/* count bubble — only when > 0 */}
                {count > 0 && (
                  <View style={[pg.pillBadge, {
                    backgroundColor: isOn ? 'rgba(255,255,255,0.3)' : meta.color,
                  }]}>
                    <Text style={pg.pillBadgeTxt}>{count}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={pg.center}>
          <View style={pg.loadSpinnerWrap}>
            <ActivityIndicator size="large" color={C.red} />
          </View>
          <Text style={pg.loadTxt}>Loading orders…</Text>
        </View>
      ) : (
        <ScrollView style={pg.list} contentContainerStyle={pg.listInner}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.red]} tintColor={C.red} />}>

          {/* Count bar */}
          <View style={pg.countBar}>
            <Text style={pg.countTxt}>
              {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
              {activeFilter !== 'All' ? <Text style={{ color: C.red }}>  ·  {activeFilter}</Text> : null}
            </Text>
            {search.length > 0 && (
              <View style={pg.searchActivePill}>
                <Icon name="magnify" size={10} color={C.muted} />
                <Text style={pg.searchActiveTxt}>"{search}"</Text>
              </View>
            )}
          </View>

          {filteredOrders.length === 0 ? (
            <View style={pg.empty}>
              <View style={pg.emptyIconWrap}>
                <Icon name="package-variant-closed" size={44} color={C.red} style={{ opacity: 0.25 }} />
              </View>
              <Text style={pg.emptyTitle}>
                {search ? 'No results found' : activeFilter !== 'All' ? `No ${activeFilter} orders` : 'No Orders Yet'}
              </Text>
              <Text style={pg.emptyTxt}>
                {search
                  ? `No orders match "${search}"`
                  : activeFilter !== 'All'
                  ? `You don't have any "${activeFilter}" orders`
                  : 'Place your first order by tapping the Create button above'}
              </Text>
              {!search && activeFilter === 'All' && (
                <Pressable style={pg.emptyBtn} onPress={() => setShowCreate(true)}>
                  <Icon name="plus" size={16} color={C.white} />
                  <Text style={pg.emptyBtnTxt}>Create Order</Text>
                </Pressable>
              )}
            </View>
          ) : (
            filteredOrders.map(order => (
              <OrderCard
                key={order.mongodbId || order._id || order.orderId || order.id}
                order={order}
                onTrack={handleTrack}
                onEdit={o => setEditOrder(o)}
                onDelete={handleDelete}
                onPlaceOrder={handlePlaceOrder}
                onView={o => setViewOrder(o)}
                onDownloadPdf={handleDownloadPdf}
              />
            ))
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ── Modals ── */}
      <CreateOrderModal visible={showCreate} onClose={() => setShowCreate(false)} onCreated={handleCreated} dealer={dealer} />
      <EditOrderModal visible={!!editOrder} order={editOrder} onClose={() => setEditOrder(null)} onSaved={handleEditSaved} />
      <ViewOrderModal visible={!!viewOrder} order={viewOrder} onClose={() => setViewOrder(null)} />
    </SafeAreaView>
  );
}

// ─── Screen Styles ────────────────────────────────────────────────────────────
const pg = StyleSheet.create({
  screen:          { flex: 1, backgroundColor: C.bg },

  // Navbar — gradient, no flat red
  navbar:          { paddingTop: Platform.OS === 'android' ? 8 : 0, paddingBottom: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn:         { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  navTitle:        { fontSize: 18, fontWeight: '900', color: C.white, letterSpacing: 0.2 },
  navSub:          { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '600', marginTop: 1 },
  createPill:      { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.white, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 8, ...sh },
  createTxt:       { fontSize: 13, fontWeight: '900', color: C.red },

  // Search
  searchWrap:      { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.white, marginHorizontal: 12, marginTop: 12, marginBottom: 4, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1.5, borderColor: '#EEF0F5', ...sh },
  searchIconWrap:  { width: 28, height: 28, borderRadius: 8, backgroundColor: '#F8F9FA', alignItems: 'center', justifyContent: 'center' },
  searchIn:        { flex: 1, fontSize: 14, color: C.text, fontWeight: '500' },

  // Filter bar — pill tabs
  filterBar:        { backgroundColor: C.bg, paddingTop: 6 },
  filterRow:        { paddingHorizontal: 12, paddingVertical: 8, gap: 8, alignItems: 'center' },
  pill:             { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22, backgroundColor: C.white, borderWidth: 1.5, borderColor: '#E4E9F0' },
  pillDot:          { width: 7, height: 7, borderRadius: 4 },
  pillTxt:          { fontSize: 13, fontWeight: '700', color: C.text },
  pillBadge:        { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  pillBadgeTxt:     { fontSize: 10, fontWeight: '900', color: '#fff' },

  // List
  list:            { flex: 1, backgroundColor: C.bg },
  listInner:       { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 32 },

  // Count bar
  countBar:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 2, marginHorizontal: 2 },
  countTxt:        { fontSize: 12, fontWeight: '700', color: C.muted },
  searchActivePill:{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF1F2', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#FECDD3' },
  searchActiveTxt: { fontSize: 11, fontWeight: '700', color: C.red },

  // Loading
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  loadSpinnerWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF1F2', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  loadTxt:         { fontSize: 14, color: C.muted, fontWeight: '600' },

  // Empty state
  empty:           { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIconWrap:   { width: 88, height: 88, borderRadius: 44, backgroundColor: '#FFF1F2', alignItems: 'center', justifyContent: 'center', marginBottom: 18, borderWidth: 1.5, borderColor: '#FECDD3' },
  emptyTitle:      { fontSize: 18, fontWeight: '900', color: C.text, marginBottom: 8 },
  emptyTxt:        { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 20 },
  emptyBtn:        { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 22, backgroundColor: C.red, borderRadius: 22, paddingHorizontal: 22, paddingVertical: 12 },
  emptyBtnTxt:     { fontSize: 14, fontWeight: '900', color: C.white },
});
