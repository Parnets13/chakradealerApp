/**
 * InvoicesPage.js — Dealer App "My Invoices" Screen
 * Data   : GET /api/dealer/invoices  (protectDealer JWT — only this dealer's data)
 * Stats  : computed client-side (no dealer-specific /stats endpoint)
 * Tabs   : All | Paid | Overdue  ("pending" key absent from backend stats → no Pending tab)
 * Columns: Invoice No, PO Number, PO Date, Ship To, Product, Brand, Qty, UOM,
 *          Dispatch Date, AWB, Courier  (exact Admin table columns)
 * Rules  : read-only — zero write calls; missing fields show "—" never hidden
 */
import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  RefreshControl,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, shadow} from './theme';
import apiService from './services/apiService';

// ─── Filter tabs (verified from backend status enum & getStats keys) ──────────
const TABS = [
  {key: 'All',     label: 'All',     icon: 'file-document-multiple-outline', color: '#C51F2B'},
  {key: 'Paid',    label: 'Paid',    icon: 'check-circle-outline',           color: '#059669'},
  {key: 'Overdue', label: 'Overdue', icon: 'alert-circle-outline',           color: '#DC2626'},
];

// ─── Status badge map ─────────────────────────────────────────────────────────
const STATUS = {
  Paid:      {color: '#059669', bg: '#D1FAE5', icon: 'check-circle'},
  Overdue:   {color: '#DC2626', bg: '#FEE2E2', icon: 'alert-circle'},
  Pending:   {color: '#D97706', bg: '#FEF3C7', icon: 'clock-outline'},
  Partial:   {color: '#B45309', bg: '#FEF3C7', icon: 'clock-half'},
  Draft:     {color: '#6B7280', bg: '#F3F4F6', icon: 'file-outline'},
  Sent:      {color: '#2563EB', bg: '#DBEAFE', icon: 'send-outline'},
  Approved:  {color: '#059669', bg: '#D1FAE5', icon: 'check-decagram'},
  Cancelled: {color: '#9CA3AF', bg: '#F3F4F6', icon: 'close-circle-outline'},
};
const stCfg = k => STATUS[k] || STATUS.Pending;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = d => {
  if (!d) return '\u2014';
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d);
    return dt.toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'});
  } catch { return String(d) || '\u2014'; }
};
const fmtRs = n =>
  '\u20b9' + (Number(n) || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const safe = v =>
  (v !== undefined && v !== null && String(v).trim() !== '') ? String(v).trim() : '\u2014';

// ─── API helpers (dealer route, AsyncStorage token via apiService) ────────────
const loadList = ({filter = 'All', search = '', page = 1, limit = 100} = {}) => {
  const q = {page, limit};
  if (filter === 'Paid')    { q.paymentStatus = 'Paid'; }
  if (filter === 'Overdue') { q.status = 'Overdue'; }
  if (search.trim())        { q.search = search.trim(); }
  return apiService.get('/invoices', q);
};

// ─── Skeleton card ────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <View style={sk.card}>
      <View style={sk.bar} />
      <View style={sk.row}>
        <View style={sk.big} />
        <View style={sk.badge} />
      </View>
      <View style={[sk.line, {width: '55%', marginTop: 8}]} />
      <View style={[sk.line, {width: '38%', marginTop: 6}]} />
      <View style={sk.sep} />
      <View style={sk.row2}>
        <View style={[sk.line, {width: '28%'}]} />
        <View style={[sk.line, {width: '34%'}]} />
      </View>
      <View style={[sk.row2, {marginBottom: 12}]}>
        <View style={[sk.line, {width: '22%'}]} />
        <View style={[sk.line, {width: '40%'}]} />
      </View>
    </View>
  );
}
const sk = StyleSheet.create({
  card: {backgroundColor:'#FFF', borderRadius:16, borderWidth:1, borderColor:'#EAECF0', marginBottom:14, overflow:'hidden'},
  bar:  {height:3, backgroundColor:'#E5E7EB'},
  row:  {flexDirection:'row', justifyContent:'space-between', padding:14, paddingBottom:0},
  big:  {height:16, width:'45%', backgroundColor:'#F0F0F0', borderRadius:6},
  badge:{height:20, width:58,  backgroundColor:'#F0F0F0', borderRadius:10},
  line: {height:11, backgroundColor:'#F3F3F3', borderRadius:5, marginHorizontal:14},
  sep:  {height:1, backgroundColor:'#F3F4F6', marginTop:12, marginHorizontal:14},
  row2: {flexDirection:'row', justifyContent:'space-between', marginHorizontal:14, marginTop:10},
});

// ─── Stats row ────────────────────────────────────────────────────────────────
function StatsRow({stats}) {
  return (
    <View style={sr.wrap}>
      <View style={sr.topRow}>
        <StatCard label="Total"   value={stats.total}   icon="file-document-multiple" color="#2563EB" bg="#DBEAFE" />
        <StatCard label="Paid"    value={stats.paid}    icon="check-circle"           color="#059669" bg="#D1FAE5" />
        <StatCard label="Overdue" value={stats.overdue} icon="alert-circle"           color="#DC2626" bg="#FEE2E2" />
      </View>
      <View style={[sr.totalCard, {borderTopColor:'#7C3AED', borderTopWidth:3}]}>
        <View style={[sr.icon, {backgroundColor:'#EDE9FE'}]}>
          <Icon name="currency-inr" size={16} color="#7C3AED" />
        </View>
        <View style={{flex:1, marginLeft:10}}>
          <Text style={sr.totalLbl}>Total Invoice Value</Text>
          <Text style={sr.totalVal}>{fmtRs(stats.totalValue)}</Text>
        </View>
        <View style={{alignItems:'flex-end'}}>
          <Text style={sr.subLbl}>Paid</Text>
          <Text style={[sr.subVal, {color:'#059669'}]}>{fmtRs(stats.paidValue)}</Text>
        </View>
      </View>
    </View>
  );
}
function StatCard({label, value, icon, color, bg}) {
  return (
    <View style={[sr.card, {borderTopColor:color, borderTopWidth:3}]}>
      <View style={[sr.icon, {backgroundColor:bg}]}>
        <Icon name={icon} size={15} color={color} />
      </View>
      <Text style={sr.val}>{value ?? 0}</Text>
      <Text style={sr.lbl}>{label}</Text>
    </View>
  );
}
const sr = StyleSheet.create({
  wrap:     {backgroundColor:'#FFF', paddingHorizontal:14, paddingBottom:12, paddingTop:4},
  topRow:   {flexDirection:'row', gap:8, marginBottom:8},
  card:     {flex:1, backgroundColor:'#FAFAFA', borderRadius:12, borderWidth:1, borderColor:'#EAECF0', padding:10, alignItems:'center'},
  icon:     {width:30, height:30, borderRadius:8, alignItems:'center', justifyContent:'center', marginBottom:5},
  val:      {color:'#111827', fontSize:18, fontWeight:'900'},
  lbl:      {color:colors.muted, fontSize:10, fontWeight:'600', marginTop:2, textAlign:'center'},
  totalCard:{flexDirection:'row', alignItems:'center', backgroundColor:'#FAFAFA', borderRadius:12, borderWidth:1, borderColor:'#EAECF0', padding:12},
  totalLbl: {color:colors.muted, fontSize:11, fontWeight:'600'},
  totalVal: {color:'#111827', fontSize:16, fontWeight:'900', marginTop:1},
  subLbl:   {color:colors.muted, fontSize:10, fontWeight:'600'},
  subVal:   {fontSize:13, fontWeight:'800', marginTop:1},
});

// ─── InfoRow ──────────────────────────────────────────────────────────────────
function InfoRow({icon, label, val, accent}) {
  return (
    <View style={ir.row}>
      <View style={ir.left}>
        <Icon name={icon} size={12} color={colors.muted} />
        <Text style={ir.lbl}>{label}</Text>
      </View>
      <Text style={[ir.val, accent && {color:colors.red, fontWeight:'900'}]} numberOfLines={2}>
        {val}
      </Text>
    </View>
  );
}
const ir = StyleSheet.create({
  row:  {flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:8, paddingHorizontal:12, borderBottomWidth:1, borderBottomColor:'#F3F4F6'},
  left: {flexDirection:'row', alignItems:'center', flex:1},
  lbl:  {color:colors.muted, fontSize:11, fontWeight:'600', marginLeft:6},
  val:  {color:'#111827', fontSize:12, fontWeight:'700', flex:1, textAlign:'right', marginLeft:12},
});

// ─── Invoice Card ─────────────────────────────────────────────────────────────
function InvoiceCard({invoice: inv, expanded, onToggle}) {
  const cfg = stCfg(inv.paymentStatus);

  // Admin table columns — raw fields from lean Invoice doc
  const poNumber  = safe(inv.purchaseOrderRef || inv.orderId);
  const poDate    = safe(fmt(inv.poDate));
  const shipName  = safe(inv.shipToName || inv.shipToMailingName);
  const shipCity  = safe(inv.shipToCity || inv.partyCity);
  const shipState = safe(inv.shipToState || inv.partyState);
  const firstItem = Array.isArray(inv.items) && inv.items.length > 0 ? inv.items[0] : null;
  const product   = safe(firstItem ? firstItem.description : (Array.isArray(inv.products) && inv.products[0] ? inv.products[0].name : null));
  const brand     = safe(inv.brandName);
  const qty       = safe(inv.totalQuantity > 0 ? inv.totalQuantity : (firstItem ? firstItem.qty : null));
  const uom       = safe(firstItem ? (firstItem.unit || firstItem.uom) : null);
  const dispatch  = safe(fmt(inv.dispatchDate));
  const awb       = safe(inv.awb);
  const courier   = safe(inv.courierName);
  const invDate   = safe(inv.date || fmt(inv.invoiceDate));

  return (
    <View style={cd.card}>
      <View style={[cd.accent, {backgroundColor: cfg.color}]} />

      {/* Header — always visible */}
      <Pressable onPress={onToggle} style={cd.head} android_ripple={{color:'#F3F4F6'}}>
        <View style={cd.hl}>
          <View style={cd.invRow}>
            <Icon name="file-document" size={14} color={colors.red} />
            <Text style={cd.invNo} numberOfLines={1}>{safe(inv.invoiceNo)}</Text>
          </View>
          <Text style={cd.poLine}>
            <Text style={cd.fk}>PO: </Text>
            <Text style={cd.fv}>{poNumber}</Text>
          </Text>
          <Text style={cd.dt}>{invDate}</Text>
        </View>
        <View style={cd.hr}>
          <View style={[cd.badge, {backgroundColor: cfg.bg}]}>
            <Icon name={cfg.icon} size={10} color={cfg.color} />
            <Text style={[cd.badgeTxt, {color: cfg.color}]}>{inv.paymentStatus || 'Pending'}</Text>
          </View>
          <Text style={cd.amt}>{safe(inv.amount)}</Text>
          <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} style={{marginTop:4}} />
        </View>
      </Pressable>

      {/* Quick-glance strip */}
      <View style={cd.strip}>
        <View style={cd.cell}>
          <Text style={cd.slbl}>SHIP TO</Text>
          <Text style={cd.sval} numberOfLines={1}>{shipCity}</Text>
        </View>
        <View style={[cd.cell, cd.cellBorder]}>
          <Text style={cd.slbl}>BRAND</Text>
          <Text style={cd.sval} numberOfLines={1}>{brand}</Text>
        </View>
        <View style={[cd.cell, cd.cellBorder]}>
          <Text style={cd.slbl}>QTY</Text>
          <Text style={cd.sval}>{qty}</Text>
        </View>
      </View>

      {/* Expanded detail */}
      {expanded ? (
        <View style={cd.body}>
          <View style={cd.divider} />

          <Text style={cd.secHdr}>{'📋 Purchase Order'}</Text>
          <View style={cd.block}>
            <InfoRow icon="receipt"         label="Invoice No"   val={safe(inv.invoiceNo)} accent />
            <InfoRow icon="tag-outline"     label="PO Number"    val={poNumber} />
            <InfoRow icon="calendar-range"  label="PO Date"      val={poDate} />
            <InfoRow icon="calendar-check"  label="Invoice Date" val={invDate} />
            {inv.dueDate ? (
              <InfoRow icon="calendar-alert" label="Due Date" val={safe(fmt(inv.dueDate))} />
            ) : null}
          </View>

          <Text style={cd.secHdr}>{'📍 Ship To'}</Text>
          <View style={cd.block}>
            <InfoRow icon="store-outline"  label="Name"    val={shipName} />
            <InfoRow icon="map-marker"     label="City"    val={shipCity} />
            <InfoRow icon="map"            label="State"   val={shipState} />
            {inv.shipToAddress ? (
              <InfoRow icon="home-outline" label="Address" val={safe(inv.shipToAddress)} />
            ) : null}
          </View>

          <Text style={cd.secHdr}>{'📦 Product'}</Text>
          <View style={cd.block}>
            <InfoRow icon="package-variant" label="Product" val={product} />
            <InfoRow icon="tag-multiple"    label="Brand"   val={brand} />
            <InfoRow icon="counter"         label="Qty"     val={qty} />
            <InfoRow icon="ruler"           label="UOM"     val={uom} />
          </View>

          <Text style={cd.secHdr}>{'🚚 Dispatch'}</Text>
          <View style={cd.block}>
            <InfoRow icon="calendar-export"  label="Dispatch Date" val={dispatch} />
            <InfoRow icon="barcode"          label="AWB"           val={awb} />
            <InfoRow icon="truck-fast"       label="Courier"       val={courier} />
            {inv.modeOfTransport ? (
              <InfoRow icon="swap-horizontal" label="Mode" val={safe(inv.modeOfTransport)} />
            ) : null}
          </View>

          {Array.isArray(inv.items) && inv.items.length > 1 ? (
            <View>
              <Text style={cd.secHdr}>{'🗂 All Items (' + inv.items.length + ')'}</Text>
              <View style={cd.itemsBox}>
                {inv.items.map((it, i) => (
                  <View
                    key={i}
                    style={[cd.itemRow, i === inv.items.length - 1 && {borderBottomWidth:0}]}>
                    <View style={{flex:1, marginRight:8}}>
                      <Text style={cd.itemName} numberOfLines={2}>{safe(it.description)}</Text>
                      {it.hsn ? <Text style={cd.itemSub}>{'HSN: ' + it.hsn}</Text> : null}
                    </View>
                    <View style={{alignItems:'flex-end'}}>
                      <Text style={cd.itemQty}>
                        {'\u00d7'}{it.qty != null ? it.qty : '\u2014'}{it.unit ? ' ' + it.unit : ''}
                      </Text>
                      {it.total > 0 ? (
                        <Text style={cd.itemAmt}>{fmtRs(it.total)}</Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const cd = StyleSheet.create({
  card:     {backgroundColor:'#FFF', borderRadius:16, borderWidth:1, borderColor:'#EAECF0', marginBottom:14, overflow:'hidden', ...shadow},
  accent:   {height:3},
  head:     {flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', padding:14, paddingBottom:10},
  hl:       {flex:1, marginRight:10},
  hr:       {alignItems:'flex-end', minWidth:90},
  invRow:   {flexDirection:'row', alignItems:'center', marginBottom:4},
  invNo:    {color:'#111827', fontSize:15, fontWeight:'900', marginLeft:5, flex:1},
  poLine:   {fontSize:12, marginBottom:2},
  fk:       {color:colors.muted, fontWeight:'600'},
  fv:       {color:'#374151', fontWeight:'700'},
  dt:       {color:colors.muted, fontSize:11, marginTop:1},
  badge:    {flexDirection:'row', alignItems:'center', paddingHorizontal:8, paddingVertical:3, borderRadius:20, alignSelf:'flex-start'},
  badgeTxt: {fontSize:10, fontWeight:'800', marginLeft:3},
  amt:      {color:'#111827', fontSize:16, fontWeight:'900', marginTop:5},
  strip:    {flexDirection:'row', borderTopWidth:1, borderTopColor:'#F3F4F6', paddingVertical:6},
  cell:     {flex:1, alignItems:'center', paddingVertical:4},
  cellBorder:{borderLeftWidth:1, borderLeftColor:'#F3F4F6'},
  slbl:     {color:colors.muted, fontSize:9, fontWeight:'700', letterSpacing:0.5, marginBottom:3},
  sval:     {color:'#111827', fontSize:12, fontWeight:'800'},
  body:     {paddingHorizontal:14, paddingBottom:16},
  divider:  {height:1, backgroundColor:'#F3F4F6', marginBottom:12},
  secHdr:   {color:'#374151', fontSize:11, fontWeight:'800', letterSpacing:0.3, marginBottom:6, marginTop:4},
  block:    {backgroundColor:'#F9FAFB', borderRadius:10, borderWidth:1, borderColor:'#EAECF0', marginBottom:12, overflow:'hidden'},
  itemsBox: {backgroundColor:'#F9FAFB', borderRadius:10, borderWidth:1, borderColor:'#EAECF0', overflow:'hidden', marginBottom:4},
  itemRow:  {flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:12, paddingVertical:8, borderBottomWidth:1, borderBottomColor:'#F3F4F6'},
  itemName: {color:'#111827', fontSize:12, fontWeight:'700', lineHeight:17},
  itemSub:  {color:colors.muted, fontSize:10, marginTop:1},
  itemQty:  {color:'#374151', fontSize:12, fontWeight:'700'},
  itemAmt:  {color:colors.red, fontSize:13, fontWeight:'900', marginTop:2},
});

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
export default function InvoicesPage({onBack}) {
  const [activeTab, setActiveTab]   = useState('All');
  const [search, setSearch]         = useState('');
  const [debSearch, setDebSearch]   = useState('');
  const [invoices, setInvoices]     = useState([]);
  const [stats, setStats]           = useState({total:0, paid:0, overdue:0, totalValue:0, paidValue:0});
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const timer = useRef(null);

  const onSearch = text => {
    setSearch(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setDebSearch(text), 400);
  };

  const calcStats = list => {
    setStats({
      total:      list.length,
      paid:       list.filter(i => i.paymentStatus === 'Paid').length,
      overdue:    list.filter(i => i.paymentStatus === 'Overdue' || i.status === 'Overdue').length,
      totalValue: list.reduce((s, i) => s + (Number(i.grandTotal) || 0), 0),
      paidValue:  list.filter(i => i.paymentStatus === 'Paid').reduce((s, i) => s + (Number(i.grandTotal) || 0), 0),
    });
  };

  const fetchData = useCallback(async (isRefresh) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      const res = await loadList({filter: activeTab, search: debSearch});
      const list = res && res.data ? res.data : [];
      setInvoices(list);
      if (!isRefresh && activeTab === 'All' && !debSearch) {
        calcStats(list);
      } else if (isRefresh) {
        const all = await loadList({filter: 'All', search: ''});
        calcStats(all && all.data ? all.data : []);
      }
    } catch (e) {
      setError(e.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, debSearch]);

  useEffect(() => { fetchData(false); }, [fetchData]);

  const toggle = id => setExpandedId(prev => prev === String(id) ? null : String(id));

  const changeTab = t => { setActiveTab(t); setExpandedId(null); };

  return (
    <View style={pg.root}>
      {/* Nav */}
      <View style={pg.nav}>
        <Pressable onPress={onBack} style={pg.navBtn} hitSlop={8}>
          <Icon name="arrow-left" size={22} color="#FFF" />
        </Pressable>
        <View style={pg.navMid}>
          <Icon name="file-document-multiple" size={19} color="#FFF" />
          <Text style={pg.navTtl}>My Invoices</Text>
        </View>
        <View style={pg.navBtn} />
      </View>

      {/* Search */}
      <View style={pg.searchWrap}>
        <View style={pg.searchBox}>
          <Icon name="magnify" size={18} color={colors.muted} style={{marginRight:6}} />
          <TextInput
            value={search}
            onChangeText={onSearch}
            placeholder="Search invoice no, order ID, dealer\u2026"
            placeholderTextColor={colors.muted}
            style={pg.searchIn}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {search.length > 0 ? (
            <Pressable onPress={() => { setSearch(''); setDebSearch(''); }} hitSlop={8}>
              <Icon name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Stats */}
      {!loading && !error ? <StatsRow stats={stats} /> : null}

      {/* Tabs */}
      <View style={pg.tabRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={pg.tabScroll}>
          {TABS.map(tab => {
            const active = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => changeTab(tab.key)}
                style={[pg.chip, active && {backgroundColor:tab.color, borderColor:tab.color}]}>
                <Icon name={tab.icon} size={12} color={active ? '#FFF' : tab.color} style={{marginRight:4}} />
                <Text style={[pg.chipTxt, active && {color:'#FFF'}]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Count */}
      {!loading && !error ? (
        <View style={pg.cntBar}>
          <Text style={pg.cntTxt}>
            {invoices.length + ' invoice' + (invoices.length !== 1 ? 's' : '')}
            {activeTab !== 'All' ? ' \u00b7 ' + activeTab : ''}
            {debSearch ? ' \u00b7 "' + debSearch + '"' : ''}
          </Text>
        </View>
      ) : null}

      {/* Skeleton */}
      {loading ? (
        <ScrollView contentContainerStyle={pg.list} showsVerticalScrollIndicator={false}>
          <Skeleton /><Skeleton /><Skeleton /><Skeleton />
        </ScrollView>
      ) : null}

      {/* Error */}
      {!loading && error ? (
        <View style={pg.center}>
          <Icon name="wifi-off" size={52} color="#E5E7EB" />
          <Text style={pg.errTtl}>Something went wrong</Text>
          <Text style={pg.errMsg}>
            {error.includes('timeout') || error.includes('connect')
              ? 'Pull down to retry.'
              : error}
          </Text>
          <Pressable style={pg.retryBtn} onPress={() => fetchData(false)}>
            <Icon name="refresh" size={16} color="#FFF" />
            <Text style={pg.retryTxt}>Try Again</Text>
          </Pressable>
        </View>
      ) : null}

      {/* List */}
      {!loading && !error ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={pg.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchData(true)}
              colors={[colors.red]}
              tintColor={colors.red}
            />
          }>
          {invoices.length === 0 ? (
            <View style={pg.empty}>
              <Icon name="file-document-outline" size={56} color="#D1D5DB" />
              <Text style={pg.emptyTtl}>No Invoices Found</Text>
              <Text style={pg.emptyMsg}>
                {activeTab !== 'All'
                  ? 'No ' + activeTab.toLowerCase() + ' invoices yet.'
                  : 'Your invoices will appear here once orders are processed.'}
              </Text>
            </View>
          ) : (
            invoices.map(inv => {
              const id = String(inv.id || inv._id);
              return (
                <InvoiceCard
                  key={id}
                  invoice={inv}
                  expanded={expandedId === id}
                  onToggle={() => toggle(inv.id || inv._id)}
                />
              );
            })
          )}
          <View style={{height:32}} />
        </ScrollView>
      ) : null}
    </View>
  );
}

const pg = StyleSheet.create({
  root: {flex:1, backgroundColor:'#F4F6F8'},
  nav: {
    backgroundColor:colors.red,
    flexDirection:'row', alignItems:'center', justifyContent:'space-between',
    paddingHorizontal:14, paddingVertical:11,
    paddingTop: Platform.OS === 'android' ? 11 : 14,
    ...shadow,
  },
  navBtn: {width:36, height:36, borderRadius:18, backgroundColor:'rgba(255,255,255,0.18)', alignItems:'center', justifyContent:'center'},
  navMid: {flexDirection:'row', alignItems:'center', flex:1, justifyContent:'center'},
  navTtl: {color:'#FFF', fontSize:17, fontWeight:'800', marginLeft:6},
  searchWrap: {backgroundColor:'#FFF', paddingHorizontal:14, paddingVertical:10, borderBottomWidth:1, borderBottomColor:'#F0F0F0'},
  searchBox:  {flexDirection:'row', alignItems:'center', backgroundColor:'#F3F4F6', borderRadius:12, paddingHorizontal:10, height:42, borderWidth:1, borderColor:'#E5E7EB'},
  searchIn:   {flex:1, color:colors.text, fontSize:13, paddingVertical:0},
  tabRow:     {backgroundColor:'#FFF', borderBottomWidth:1, borderBottomColor:'#F0F0F0'},
  tabScroll:  {paddingHorizontal:14, paddingVertical:10, gap:8},
  chip:       {flexDirection:'row', alignItems:'center', paddingHorizontal:14, paddingVertical:6, borderRadius:20, borderWidth:1.5, borderColor:'#E5E7EB', backgroundColor:'#F9FAFB'},
  chipTxt:    {color:colors.muted, fontSize:12, fontWeight:'700'},
  cntBar:     {paddingHorizontal:16, paddingVertical:7, backgroundColor:'#FAFAFA', borderBottomWidth:1, borderBottomColor:'#F0F0F0'},
  cntTxt:     {fontSize:11, color:colors.muted, fontWeight:'600'},
  list:       {padding:14, paddingBottom:36},
  center:     {flex:1, alignItems:'center', justifyContent:'center', padding:32},
  errTtl:     {marginTop:14, color:'#111827', fontSize:15, fontWeight:'800'},
  errMsg:     {marginTop:6, color:colors.muted, fontSize:12, textAlign:'center', lineHeight:18},
  retryBtn:   {marginTop:18, flexDirection:'row', alignItems:'center', backgroundColor:colors.red, paddingHorizontal:22, paddingVertical:10, borderRadius:10, gap:6},
  retryTxt:   {color:'#FFF', fontWeight:'700', fontSize:13},
  empty:      {alignItems:'center', paddingVertical:60},
  emptyTtl:   {marginTop:14, color:'#374151', fontSize:15, fontWeight:'800'},
  emptyMsg:   {marginTop:6, color:colors.muted, fontSize:12, textAlign:'center', lineHeight:18, paddingHorizontal:20},
});
