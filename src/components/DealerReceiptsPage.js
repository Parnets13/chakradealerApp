import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {shadow} from './theme';
import apiService from './services/apiService';
import {API_ENDPOINTS} from './config/api';

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
  teal:         '#00695C',
  tealLight:    '#E0F2F1',
  bg:           '#F5F7FA',
  card:         '#FFFFFF',
  border:       '#E2E8F0',
  text:         '#1A2332',
  textSub:      '#4A5568',
  muted:        '#718096',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtCurrency = n => {
  const num = typeof n === 'string' ? parseFloat(n) : Number(n);
  if (!n || isNaN(num)) return '₹0.00';
  return `₹${num.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
};

const fmtDate = d => {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d);
    return dt.toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'});
  } catch { return String(d); }
};

// ─── Payment Method Normalizer ─────────────────────────────────────────────
// Maps raw paymentMethod string → one of 5 standard categories
const normalizePmt = raw => {
  const m = (raw || '').toLowerCase();
  if (m === 'cash')                                               return 'Cash';
  if (m.includes('credit') || m.includes('debit') ||
      m.includes('card') || m.includes('visa') ||
      m.includes('master') || m.includes('rupay'))               return 'Card';
  if (m.includes('upi')  || m.includes('gpay')  ||
      m.includes('phonepe') || m.includes('paytm') ||
      m.includes('wallet') || m.includes('digital'))             return 'Digital Wallet';
  if (m.includes('bank') || m.includes('neft') ||
      m.includes('rtgs') || m.includes('imps') ||
      m.includes('transfer') || m.includes('cheque') ||
      m.includes('check') || m.includes('kotak') ||
      m.includes('hdfc') || m.includes('icici') ||
      m.includes('sbi')  || m.includes('axis')  ||
      m.includes('a/c')  || m.includes('cc '))                   return 'Bank Transfer';
  if (m === 'tally' || m === 'other' || m === '')                return 'Other';
  // Anything else that looks like a bank account name
  return 'Bank Transfer';
};

// Visual config per category
const PMT_CFG = {
  'Cash':           {icon: 'cash',               color: '#2E7D32', bg: '#E8F5E9',  label: 'Cash'},
  'Card':           {icon: 'credit-card-outline', color: '#7C3AED', bg: '#EDE9FE',  label: 'Card'},
  'Digital Wallet': {icon: 'wallet-outline',      color: '#0369A1', bg: '#E0F2FE',  label: 'Digital Wallet'},
  'Bank Transfer':  {icon: 'bank-transfer',       color: '#1565C0', bg: '#E3F0FF',  label: 'Bank Transfer'},
  'Other':          {icon: 'dots-horizontal',     color: '#718096', bg: '#F3F4F6',  label: 'Other'},
};

const pmtCfg = raw => PMT_CFG[normalizePmt(raw)] || PMT_CFG['Other'];

// ─── Status Badge Config ──────────────────────────────────────────────────────
const statusCfg = status => {
  const s = (status || '').toLowerCase();
  if (s === 'completed') return {color: C.success, bg: C.successLight};
  if (s === 'pending')   return {color: C.warning, bg: C.warningLight};
  return {color: C.danger, bg: C.dangerLight};
};

// ─── Date Filter presets ──────────────────────────────────────────────────────
const DATE_FILTERS = [
  {label: 'All',           value: 'all'},
  {label: 'This Month',    value: 'this_month'},
  {label: 'Last Month',    value: 'last_month'},
  {label: 'Last 3 Months', value: 'last_3_months'},
];

// Payment method filter pills
const PMT_FILTERS = [
  {label: 'All',            value: 'all'},
  {label: 'Bank Transfer',  value: 'Bank Transfer'},
  {label: 'Cash',           value: 'Cash'},
  {label: 'Card',           value: 'Card'},
  {label: 'Digital Wallet', value: 'Digital Wallet'},
  {label: 'Other',          value: 'Other'},
];

const getDateRange = preset => {
  const now = new Date();
  if (preset === 'this_month') {
    return {start: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0),
            end:   new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)};
  }
  if (preset === 'last_month') {
    return {start: new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0),
            end:   new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)};
  }
  if (preset === 'last_3_months') {
    return {start: new Date(now.getFullYear(), now.getMonth() - 3, 1, 0, 0, 0),
            end:   new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)};
  }
  return null;
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:10}}>
        <View style={[styles.skel,{width:'45%',height:12}]} />
        <View style={[styles.skel,{width:'22%',height:20,borderRadius:10}]} />
      </View>
      <View style={[styles.skel,{width:'65%',height:13,marginBottom:6}]} />
      <View style={[styles.skel,{width:'40%',height:12,marginBottom:8}]} />
      <View style={[styles.skel,{width:'38%',height:22,marginBottom:10}]} />
      <View style={{height:1,backgroundColor:C.border,marginBottom:10}} />
      <View style={{flexDirection:'row',justifyContent:'space-between'}}>
        <View style={[styles.skel,{width:'42%',height:28,borderRadius:14}]} />
        <View style={[styles.skel,{width:'28%',height:24,borderRadius:14}]} />
      </View>
    </View>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DealerReceiptsPage({onBack}) {
  const [allReceipts, setAllReceipts] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [error,       setError]       = useState(null);
  const [dateFilter,  setDateFilter]  = useState('all');
  const [pmtFilter,   setPmtFilter]   = useState('all');
  const [page,        setPage]        = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 20;

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      const res = await apiService.get(API_ENDPOINTS.FINANCE.RECEIPTS);
      if (res?.success) {
        setAllReceipts(res.data || []);
        setPage(1);
      } else {
        setError(res?.message || 'Failed to load receipts');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Filters ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = allReceipts;
    // Date filter
    const range = getDateRange(dateFilter);
    if (range) {
      list = list.filter(r => {
        const d = new Date(r.date);
        return d >= range.start && d <= range.end;
      });
    }
    // Payment method filter
    if (pmtFilter !== 'all') {
      list = list.filter(r => normalizePmt(r.paymentMethod) === pmtFilter);
    }
    return list;
  }, [allReceipts, dateFilter, pmtFilter]);

  const displayed = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page]);

  const summary = useMemo(() => ({
    totalReceived: filtered.reduce((s, r) => s + (Number(r.amount) || 0), 0),
    totalReceipts: filtered.length,
  }), [filtered]);

  const loadMore = () => {
    if (displayed.length < filtered.length && !loadingMore) {
      setLoadingMore(true);
      setTimeout(() => { setPage(p => p + 1); setLoadingMore(false); }, 250);
    }
  };

  const handleDateFilter = f => { setDateFilter(f); setPage(1); };
  const handlePmtFilter  = f => { setPmtFilter(f);  setPage(1); };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.screen}>
        <Header onBack={onBack} count={0} onRefresh={() => {}} />
        <ScrollView contentContainerStyle={{padding:16}}>
          <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
        </ScrollView>
      </View>
    );
  }

  // ── Error (no data) ───────────────────────────────────────────────────────
  if (error && allReceipts.length === 0) {
    return (
      <View style={styles.screen}>
        <Header onBack={onBack} count={0} onRefresh={() => fetchData(true)} />
        <View style={styles.centerBox}>
          <Icon name="wifi-off" size={52} color={C.border} />
          <Text style={styles.errTitle}>Something went wrong.</Text>
          <Text style={styles.errSub}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => fetchData(true)}>
            <Icon name="refresh" size={16} color="#FFF" />
            <Text style={styles.retryTxt}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Header onBack={onBack} count={filtered.length} onRefresh={() => fetchData(true)} />
      <FlatList
        data={displayed}
        keyExtractor={(item, idx) => item.id || String(idx)}
        contentContainerStyle={styles.listBody}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)}
            colors={[C.primary]} tintColor={C.primary} />
        }
        ListHeaderComponent={
          <>
            <SummaryRow summary={summary} />
            {/* Date filter */}
            <FilterPills
              items={DATE_FILTERS} active={dateFilter}
              onChange={handleDateFilter} />
            {/* Payment method filter */}
            <FilterPills
              items={PMT_FILTERS} active={pmtFilter}
              onChange={handlePmtFilter}
              style={{marginTop: -6, marginBottom: 16}} />
            {error ? (
              <View style={styles.errCard}>
                <Icon name="alert-circle-outline" size={15} color={C.danger} />
                <Text style={styles.errCardTxt}>{error}</Text>
              </View>
            ) : null}
          </>
        }
        ListEmptyComponent={<EmptyState />}
        ListFooterComponent={
          displayed.length < filtered.length ? (
            <Pressable style={styles.loadMoreBtn} onPress={loadMore}>
              {loadingMore
                ? <ActivityIndicator size="small" color={C.primary} />
                : <Text style={styles.loadMoreTxt}>Load more ({filtered.length - displayed.length} remaining)</Text>}
            </Pressable>
          ) : <View style={{height: 32}} />
        }
        renderItem={({item}) => <ReceiptCard item={item} />}
      />
    </View>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function Header({onBack, count, onRefresh}) {
  return (
    <View style={styles.header}>
      <Pressable style={styles.headerBtn} onPress={onBack}>
        <Icon name="arrow-left" size={22} color="#FFF" />
      </Pressable>
      <View style={{flex:1}}>
        <Text style={styles.headerTitle}>Receipts</Text>
        <Text style={styles.headerSub}>{count} records</Text>
      </View>
      <Pressable style={styles.headerBtn} onPress={onRefresh}>
        <Icon name="refresh" size={20} color="#FFF" />
      </Pressable>
    </View>
  );
}

// ─── Summary Row ──────────────────────────────────────────────────────────────
function SummaryRow({summary}) {
  return (
    <View style={styles.summaryRow}>
      <View style={[styles.summaryCard, {flex:2, flexDirection:'row', alignItems:'center', gap:12}]}>
        <View style={[styles.summaryIcon, {backgroundColor: C.successLight}]}>
          <Icon name="currency-inr" size={22} color={C.success} />
        </View>
        <View style={{flex:1}}>
          <Text style={styles.summaryAmount} numberOfLines={1}>
            {fmtCurrency(summary.totalReceived)}
          </Text>
          <Text style={styles.summaryLbl}>Total Amount Received</Text>
        </View>
      </View>
      <View style={[styles.summaryCard, {flex:1, alignItems:'center'}]}>
        <View style={[styles.summaryIcon, {backgroundColor: C.primaryLight}]}>
          <Icon name="receipt" size={22} color={C.primary} />
        </View>
        <Text style={styles.summaryCount}>{summary.totalReceipts}</Text>
        <Text style={styles.summaryLbl}>Total Receipts</Text>
      </View>
    </View>
  );
}

// ─── Generic Filter Pills ─────────────────────────────────────────────────────
function FilterPills({items, active, onChange, style}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.pillsRow}
      style={[{marginBottom: 14}, style]}>
      {items.map(f => (
        <Pressable key={f.value}
          onPress={() => onChange(f.value)}
          style={[styles.pill, active === f.value && styles.pillActive]}>
          <Text style={[styles.pillTxt, active === f.value && styles.pillTxtActive]}>
            {f.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

// ─── Receipt Card ─────────────────────────────────────────────────────────────
function ReceiptCard({item}) {
  const st  = statusCfg(item.status);
  const pmt = pmtCfg(item.paymentMethod);
  const isCompleted = (item.status || '').toLowerCase() === 'completed';

  return (
    <View style={[styles.card, isCompleted && styles.cardGreen]}>

      {/* Date + Status */}
      <View style={styles.cardRow}>
        <View style={{flexDirection:'row', alignItems:'center', gap:5}}>
          <Icon name="calendar-outline" size={13} color={C.muted} />
          <Text style={styles.cardDate}>{fmtDate(item.date)}</Text>
        </View>
        <View style={[styles.statusBadge, {backgroundColor: st.bg}]}>
          <Text style={[styles.statusTxt, {color: st.color}]}>{item.status || 'Completed'}</Text>
        </View>
      </View>

      {/* Dealer / Party Name */}
      <View style={{flexDirection:'row', alignItems:'center', gap:5, marginBottom:5}}>
        <Icon name="domain" size={13} color={C.muted} />
        <Text style={styles.dealerName} numberOfLines={1}>{item.dealerName || '—'}</Text>
      </View>

      {/* Invoice Number */}
      <View style={{flexDirection:'row', alignItems:'center', gap:5, marginBottom:8}}>
        <Icon name="file-document-outline" size={13} color={C.muted} />
        <Text style={styles.fieldLbl}>Invoice no: </Text>
        <Text style={styles.fieldVal}>{item.invoiceNumber || '—'}</Text>
      </View>

      {/* Amount — prominent */}
      <Text style={styles.amount}>{fmtCurrency(item.amount)}</Text>

      <View style={styles.divider} />

      {/* Payment Method badge + Source badge */}
      <View style={styles.cardRow}>
        <View style={[styles.pmtBadge, {backgroundColor: pmt.bg}]}>
          <Icon name={pmt.icon} size={14} color={pmt.color} />
          <Text style={[styles.pmtTxt, {color: pmt.color}]} numberOfLines={1}>
            {pmt.label}
          </Text>
        </View>
        <View style={[styles.srcBadge,
          {backgroundColor: item.source === 'Tally' ? '#DCFCE7' : C.infoLight}]}>
          <Icon name={item.source === 'Tally' ? 'sync' : 'database'} size={11}
            color={item.source === 'Tally' ? '#15803D' : C.info} />
          <Text style={[styles.srcTxt,
            {color: item.source === 'Tally' ? '#15803D' : C.info}]}>
            {item.source || 'ERP'}
          </Text>
        </View>
      </View>

      {/* Narration */}
      {!!item.narration && (
        <View style={styles.narrationRow}>
          <Icon name="text-box-outline" size={12} color={C.muted} />
          <Text style={styles.narrationTxt} numberOfLines={2}>{item.narration}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <View style={styles.emptyWrap}>
      <Icon name="cash-remove" size={52} color={C.border} />
      <Text style={styles.emptyTitle}>No Records Found</Text>
      <Text style={styles.emptySub}>
        No payment records match your current filter.{'\n'}
        Payments recorded by admin appear here automatically.
      </Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen:   {flex:1, backgroundColor: C.bg},
  listBody: {padding:16, paddingBottom:32},
  centerBox:{flex:1, alignItems:'center', justifyContent:'center', padding:32},

  header: {
    flexDirection:'row', alignItems:'center',
    backgroundColor: C.primary,
    paddingHorizontal:16, paddingTop:14, paddingBottom:16, gap:10,
  },
  headerBtn: {
    width:38, height:38, borderRadius:19,
    backgroundColor:'rgba(255,255,255,0.18)',
    alignItems:'center', justifyContent:'center',
  },
  headerTitle: {color:'#FFF', fontSize:18, fontWeight:'800'},
  headerSub:   {color:'rgba(255,255,255,0.72)', fontSize:12, marginTop:1},

  summaryRow:   {flexDirection:'row', gap:10, marginBottom:14},
  summaryCard:  {
    backgroundColor:C.card, borderRadius:14,
    padding:14, borderWidth:1, borderColor:C.border, ...shadow,
  },
  summaryIcon:  {
    width:42, height:42, borderRadius:11,
    alignItems:'center', justifyContent:'center', marginBottom:6,
  },
  summaryAmount:{color:C.text, fontSize:14, fontWeight:'900'},
  summaryCount: {color:C.text, fontSize:26, fontWeight:'900'},
  summaryLbl:   {color:C.muted, fontSize:11, fontWeight:'600', marginTop:2},

  pillsRow: {flexDirection:'row', gap:8, paddingVertical:2},
  pill: {
    paddingHorizontal:14, paddingVertical:7,
    borderRadius:20, backgroundColor:C.card,
    borderWidth:1, borderColor:C.border,
  },
  pillActive:   {backgroundColor: C.primaryDark, borderColor: C.primaryDark},
  pillTxt:      {color:C.muted, fontSize:12, fontWeight:'600'},
  pillTxtActive:{color:'#FFF', fontSize:12, fontWeight:'700'},

  errCard:   {
    flexDirection:'row', alignItems:'center', gap:8,
    backgroundColor:C.dangerLight, borderRadius:12,
    padding:12, borderWidth:1, borderColor:'#FECACA', marginBottom:12,
  },
  errCardTxt:{color:C.danger, fontSize:13, flex:1},

  card: {
    backgroundColor:C.card, borderRadius:14,
    borderWidth:1, borderColor:C.border,
    padding:14, marginBottom:10, ...shadow,
  },
  cardGreen:  {borderLeftWidth:4, borderLeftColor:C.success},
  cardRow:    {flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8},
  cardDate:   {color:C.text, fontSize:13, fontWeight:'700'},
  statusBadge:{borderRadius:20, paddingHorizontal:10, paddingVertical:3},
  statusTxt:  {fontSize:11, fontWeight:'700'},
  dealerName: {color:C.textSub, fontSize:13, fontWeight:'700', flex:1},
  fieldLbl:   {color:C.muted, fontSize:12, fontWeight:'500'},
  fieldVal:   {color:C.text, fontSize:12, fontWeight:'700', flex:1},
  amount:     {color:C.success, fontSize:22, fontWeight:'900', marginBottom:10, letterSpacing:0.2},
  divider:    {height:1, backgroundColor:C.border, marginBottom:10},

  pmtBadge: {
    flexDirection:'row', alignItems:'center', gap:6,
    borderRadius:20, paddingHorizontal:12, paddingVertical:6,
    maxWidth:'60%',
  },
  pmtTxt:  {fontSize:12, fontWeight:'700', flexShrink:1},
  srcBadge:{
    flexDirection:'row', alignItems:'center', gap:4,
    borderRadius:20, paddingHorizontal:9, paddingVertical:4,
  },
  srcTxt:  {fontSize:11, fontWeight:'700'},

  narrationRow:{
    flexDirection:'row', alignItems:'flex-start', gap:5,
    marginTop:8, paddingTop:8,
    borderTopWidth:1, borderTopColor:C.border,
  },
  narrationTxt:{color:C.muted, fontSize:12, fontStyle:'italic', flex:1, lineHeight:17},

  skel: {backgroundColor:'#E2E8F0', borderRadius:6},

  loadMoreBtn:{
    alignItems:'center', justifyContent:'center',
    backgroundColor:C.card, borderRadius:12,
    padding:14, borderWidth:1, borderColor:C.border, marginTop:4,
  },
  loadMoreTxt:{color:C.primary, fontWeight:'700', fontSize:13},

  errTitle:{color:C.text, fontSize:16, fontWeight:'700', marginTop:14, textAlign:'center'},
  errSub:  {color:C.muted, fontSize:13, textAlign:'center', marginTop:6, paddingHorizontal:20, lineHeight:19},
  retryBtn:{
    flexDirection:'row', alignItems:'center', gap:6,
    backgroundColor:C.primary, borderRadius:10,
    paddingHorizontal:20, paddingVertical:10, marginTop:16,
  },
  retryTxt:{color:'#FFF', fontWeight:'700', fontSize:14},

  emptyWrap: {alignItems:'center', paddingVertical:60},
  emptyTitle:{color:C.text, fontSize:16, fontWeight:'700', marginTop:14},
  emptySub:  {color:C.muted, fontSize:13, textAlign:'center', marginTop:6, paddingHorizontal:24, lineHeight:20},
});
