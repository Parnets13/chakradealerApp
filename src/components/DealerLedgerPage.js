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
  danger:       '#DC2626',
  dangerLight:  '#FEF2F2',
  warning:      '#B45309',
  warningLight: '#FEF3C7',
  info:         '#1565C0',
  infoLight:    '#E3F0FF',
  teal:         '#00695C',
  tealLight:    '#E0F2F1',
  purple:       '#7C3AED',
  purpleLight:  '#EDE9FE',
  bg:           '#F5F7FA',
  card:         '#FFFFFF',
  border:       '#E2E8F0',
  text:         '#1A2332',
  textSub:      '#4A5568',
  muted:        '#718096',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtCurrency = n => {
  if (typeof n !== 'number' && typeof n !== 'string') return '₹0.00';
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (isNaN(num)) return '₹0.00';
  return `₹${Math.abs(num).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
};

const fmtDate = d => {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'});
  } catch { return d; }
};

// ─── Filter Definitions ───────────────────────────────────────────────────────
const FILTERS = [
  {label: 'All',           value: 'all'},
  {label: 'This Month',    value: 'this_month'},
  {label: 'Last Month',    value: 'last_month'},
  {label: 'Last 3 Months', value: 'last_3_months'},
];

const getDateRange = preset => {
  const now = new Date();
  if (preset === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return {start, end};
  }
  if (preset === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const end   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return {start, end};
  }
  if (preset === 'last_3_months') {
    const start = new Date(now.getFullYear(), now.getMonth() - 3, 1, 0, 0, 0, 0);
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return {start, end};
  }
  return null; // 'all' → no filter
};

// ─── Type Badge Config ────────────────────────────────────────────────────────
const typeCfg = type => {
  const t = (type || '').toLowerCase();
  if (t === 'invoice')     return {color: C.info,    bg: C.infoLight,    icon: 'file-document-outline'};
  if (t === 'receipt')     return {color: C.success, bg: C.successLight, icon: 'cash-check'};
  if (t === 'credit note') return {color: C.teal,    bg: C.tealLight,    icon: 'note-plus-outline'};
  if (t === 'debit note')  return {color: C.purple,  bg: C.purpleLight,  icon: 'note-minus-outline'};
  return {color: C.muted, bg: '#F3F4F6', icon: 'file-outline'};
};

// ─── Skeleton Loader ──────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8}}>
        <View style={[styles.skelRow, {width: '40%', height: 12}]} />
        <View style={[styles.skelRow, {width: '22%', height: 20, borderRadius: 10}]} />
      </View>
      <View style={[styles.skelRow, {width: '60%', height: 14, marginBottom: 5}]} />
      <View style={[styles.skelRow, {width: '50%', height: 12, marginBottom: 10}]} />
      <View style={styles.cardDivider} />
      <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 8}}>
        <View style={[styles.skelRow, {width: '28%', height: 14}]} />
        <View style={[styles.skelRow, {width: '28%', height: 14}]} />
        <View style={[styles.skelRow, {width: '28%', height: 16}]} />
      </View>
    </View>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DealerLedgerPage({onBack}) {
  const [allEntries,  setAllEntries]  = useState([]);
  const [summary,     setSummary]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [error,       setError]       = useState(null);
  const [filter,      setFilter]      = useState('all');
  const [page,        setPage]        = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const PAGE_SIZE = 20;

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      const res = await apiService.get(API_ENDPOINTS.FINANCE.LEDGER);
      if (res?.success) {
        setAllEntries(res.data    || []);
        setSummary   (res.summary || null);
        setPage(1);
      } else {
        setError(res?.message || 'Failed to load ledger');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Client-side filter ──────────────────────────────────────────────────────
  const filteredEntries = useMemo(() => {
    const range = getDateRange(filter);
    if (!range) return allEntries;
    return allEntries.filter(e => {
      const d = new Date(e.date);
      return d >= range.start && d <= range.end;
    });
  }, [allEntries, filter]);

  // ── Pagination ──────────────────────────────────────────────────────────────
  const displayed = useMemo(() => filteredEntries.slice(0, page * PAGE_SIZE), [filteredEntries, page]);

  // ── Summary for filter ──────────────────────────────────────────────────────
  const displayedSummary = useMemo(() => {
    const total = filteredEntries.length;
    if (total === 0) return {openingBalance: 0, currentBalance: 0, totalEntries: 0, fromTallyCount: 0};
    const openingBalance = filteredEntries[0]?.balance ?? 0;
    const currentBalance = filteredEntries[total - 1]?.balance ?? 0;
    // If API summary available AND filter is 'all', use API summary directly
    if (filter === 'all' && summary) {
      return {
        openingBalance: summary.openingBalance ?? 0,
        currentBalance: summary.currentBalance ?? currentBalance,
        totalEntries:   summary.totalEntries   ?? total,
        fromTallyCount: (summary.tallyInvoices || 0) + (summary.tallyReceipts || 0),
      };
    }
    return {
      openingBalance,
      currentBalance,
      totalEntries: total,
      fromTallyCount: filteredEntries.filter(e => e.source === 'Tally').length,
    };
  }, [filteredEntries, summary, filter]);

  const loadMore = () => {
    if (displayed.length < filteredEntries.length && !loadingMore) {
      setLoadingMore(true);
      setTimeout(() => { setPage(p => p + 1); setLoadingMore(false); }, 300);
    }
  };

  const handleFilterChange = f => { setFilter(f); setPage(1); };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.screen}>
        <Header onBack={onBack} count={0} onRefresh={() => {}} />
        <ScrollView contentContainerStyle={styles.scrollBody}>
          <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
        </ScrollView>
      </View>
    );
  }

  // ── Error (no data) ─────────────────────────────────────────────────────────
  if (error && allEntries.length === 0) {
    return (
      <View style={styles.screen}>
        <Header onBack={onBack} count={0} onRefresh={() => fetchData(true)} />
        <View style={styles.centerBox}>
          <Icon name="wifi-off" size={52} color={C.border} />
          <Text style={styles.errorTitle}>Something went wrong.</Text>
          <Text style={styles.errorSub}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => fetchData(true)}>
            <Icon name="refresh" size={16} color="#FFF" />
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Header onBack={onBack} count={filteredEntries.length} onRefresh={() => fetchData(true)} />
      <FlatList
        data={displayed}
        keyExtractor={(item, idx) => item.id || String(idx)}
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
            <SummarySection summary={displayedSummary} />
            <FilterRow active={filter} onChange={handleFilterChange} />
            {error ? (
              <View style={styles.errorCard}>
                <Icon name="alert-circle-outline" size={16} color={C.danger} />
                <Text style={styles.errorCardText}>{error}</Text>
              </View>
            ) : null}
          </>
        }
        ListEmptyComponent={<EmptyState />}
        ListFooterComponent={
          displayed.length < filteredEntries.length ? (
            <Pressable style={styles.loadMoreBtn} onPress={loadMore}>
              {loadingMore
                ? <ActivityIndicator size="small" color={C.primary} />
                : <Text style={styles.loadMoreText}>Load more</Text>}
            </Pressable>
          ) : <View style={{height: 32}} />
        }
        renderItem={({item}) => <LedgerCard entry={item} />}
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
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>Dealer Ledger</Text>
        <Text style={styles.headerSub}>{count} entries</Text>
      </View>
      <Pressable style={styles.headerBtn} onPress={onRefresh}>
        <Icon name="refresh" size={20} color="#FFF" />
      </Pressable>
    </View>
  );
}

// ─── Summary Section (2×2 grid) ───────────────────────────────────────────────
function SummarySection({summary}) {
  const cards = [
    {
      label: 'Opening Balance',
      value: fmtCurrency(summary.openingBalance),
      icon: 'calendar-start',
      iconBg: C.infoLight, iconColor: C.info,
    },
    {
      label: 'Current Balance',
      value: fmtCurrency(summary.currentBalance),
      icon: 'scale-balance',
      iconBg: summary.currentBalance > 0 ? C.dangerLight : C.successLight,
      iconColor: summary.currentBalance > 0 ? C.danger : C.success,
    },
    {
      label: 'Total Entries',
      value: String(summary.totalEntries),
      icon: 'format-list-numbered',
      iconBg: C.primaryLight, iconColor: C.primary,
    },
    {
      label: 'From Tally',
      value: String(summary.fromTallyCount),
      icon: 'sync',
      iconBg: C.successLight, iconColor: C.teal,
    },
  ];
  return (
    <View style={styles.summaryGrid}>
      {cards.map(c => (
        <View key={c.label} style={styles.summaryCard}>
          <View style={[styles.summaryIconWrap, {backgroundColor: c.iconBg}]}>
            <Icon name={c.icon} size={18} color={c.iconColor} />
          </View>
          <Text style={styles.summaryValue}>{c.value}</Text>
          <Text style={styles.summaryLabel}>{c.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Filter Row ───────────────────────────────────────────────────────────────
function FilterRow({active, onChange}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterRow}
      style={styles.filterScroll}>
      {FILTERS.map(f => (
        <Pressable
          key={f.value}
          onPress={() => onChange(f.value)}
          style={[styles.filterChip, active === f.value && styles.filterChipActive]}>
          <Text style={[styles.filterChipText, active === f.value && styles.filterChipTextActive]}>
            {f.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

// ─── Ledger Card ──────────────────────────────────────────────────────────────
function LedgerCard({entry}) {
  const tc = typeCfg(entry.type);
  return (
    <View style={styles.card}>
      {/* Row 1: Date + Type badge */}
      <View style={styles.cardTopRow}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 5}}>
          <Icon name="calendar-outline" size={14} color={C.muted} />
          <Text style={styles.cardDate}>{fmtDate(entry.date)}</Text>
        </View>
        <View style={[styles.typeBadge, {backgroundColor: tc.bg}]}>
          <Icon name={tc.icon} size={11} color={tc.color} />
          <Text style={[styles.typeBadgeText, {color: tc.color}]}>{entry.type || '—'}</Text>
        </View>
      </View>

      {/* Ref */}
      <Text style={styles.cardRef}>Ref: {entry.reference || '—'}</Text>

      {/* Party */}
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10}}>
        <Icon name="domain" size={14} color={C.muted} />
        <Text style={styles.cardParty}>{entry.party || '—'}</Text>
      </View>

      <View style={styles.cardDivider} />

      {/* Debit | Credit | Balance */}
      <View style={styles.amountsRow}>
        <View style={styles.amountCol}>
          <Text style={styles.amountLabel}>Debit</Text>
          <Text style={[styles.amountValue, {color: entry.debit > 0 ? C.success : C.muted}]}>
            {entry.debit > 0 ? fmtCurrency(entry.debit) : '—'}
          </Text>
        </View>
        <View style={styles.amountSep} />
        <View style={styles.amountCol}>
          <Text style={styles.amountLabel}>Credit</Text>
          <Text style={[styles.amountValue, {color: entry.credit > 0 ? C.danger : C.muted}]}>
            {entry.credit > 0 ? fmtCurrency(entry.credit) : '—'}
          </Text>
        </View>
        <View style={styles.amountSep} />
        <View style={[styles.amountCol, {alignItems: 'flex-end'}]}>
          <Text style={styles.amountLabel}>Balance</Text>
          <Text style={[styles.balanceValue, {
            color: entry.balance > 0 ? C.danger : entry.balance < 0 ? C.success : C.muted
          }]}>
            {fmtCurrency(entry.balance)}
          </Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      {/* Source */}
      <Text style={styles.sourceText}>
        Source: <Text style={styles.sourceValue}>{entry.source || '—'}</Text>
      </Text>
    </View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <View style={styles.emptyWrap}>
      <Icon name="book-open-variant" size={54} color={C.border} />
      <Text style={styles.emptyTitle}>No Ledger Entries Found</Text>
      <Text style={styles.emptySub}>
        Your transaction ledger will appear here automatically.
      </Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen:    {flex: 1, backgroundColor: C.bg},
  listBody:  {padding: 16, paddingBottom: 32},
  scrollBody:{padding: 16},
  centerBox: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32},

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.primary,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16,
    gap: 10,
  },
  headerBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: {flex: 1},
  headerTitle:  {color: '#FFF', fontSize: 18, fontWeight: '800'},
  headerSub:    {color: 'rgba(255,255,255,0.72)', fontSize: 12, marginTop: 1},

  // Summary
  summaryGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14},
  summaryCard: {
    width: '47%', backgroundColor: C.card,
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: C.border, ...shadow,
  },
  summaryIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  summaryValue: {color: C.text, fontSize: 14, fontWeight: '900'},
  summaryLabel: {color: C.muted, fontSize: 11, fontWeight: '600', marginTop: 2},

  // Filter
  filterScroll:        {marginBottom: 16},
  filterRow:           {flexDirection: 'row', gap: 8, paddingVertical: 2},
  filterChip:          {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border,
  },
  filterChipActive:    {backgroundColor: C.primaryDark || '#A0001C', borderColor: C.primaryDark || '#A0001C'},
  filterChipText:      {color: C.muted, fontSize: 12, fontWeight: '600'},
  filterChipTextActive:{color: '#FFF', fontSize: 12, fontWeight: '700'},

  // Error
  errorCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.dangerLight, borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: '#FECACA', marginBottom: 12,
  },
  errorCardText: {color: C.danger, fontSize: 13, flex: 1},

  // Ledger Card
  card: {
    backgroundColor: C.card, borderRadius: 14,
    borderWidth: 1, borderColor: C.border,
    padding: 14, marginBottom: 10, ...shadow,
  },
  cardTopRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  cardDate:     {color: C.text, fontSize: 13, fontWeight: '700'},
  typeBadge:    {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3,
  },
  typeBadgeText:{fontSize: 11, fontWeight: '800'},
  cardRef:      {color: C.text, fontSize: 13, fontWeight: '700', marginBottom: 4},
  cardParty:    {color: C.textSub, fontSize: 12, fontWeight: '600', flex: 1},
  cardDivider:  {height: 1, backgroundColor: C.border, marginVertical: 10},
  amountsRow:   {flexDirection: 'row', alignItems: 'flex-start'},
  amountCol:    {flex: 1, gap: 3},
  amountSep:    {width: 1, backgroundColor: C.border, marginHorizontal: 8, alignSelf: 'stretch'},
  amountLabel:  {color: C.muted, fontSize: 10, fontWeight: '600', textTransform: 'uppercase'},
  amountValue:  {fontSize: 13, fontWeight: '800'},
  balanceValue: {fontSize: 15, fontWeight: '900'},
  sourceText:   {color: C.muted, fontSize: 11, fontWeight: '500'},
  sourceValue:  {color: C.textSub, fontWeight: '700'},

  // Skeleton
  skelRow:     {backgroundColor: '#E2E8F0', borderRadius: 6},

  // Load More
  loadMoreBtn: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.card, borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: C.border, marginTop: 4,
  },
  loadMoreText: {color: C.primary, fontWeight: '700', fontSize: 13},

  // Error full screen
  errorTitle: {color: C.text, fontSize: 16, fontWeight: '700', marginTop: 14, textAlign: 'center'},
  errorSub:   {
    color: C.muted, fontSize: 13, textAlign: 'center',
    marginTop: 6, paddingHorizontal: 20, lineHeight: 19,
  },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.primary, borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 10, marginTop: 16,
  },
  retryText: {color: '#FFF', fontWeight: '700', fontSize: 14},

  // Empty
  emptyWrap:  {alignItems: 'center', paddingVertical: 60},
  emptyTitle: {color: C.text, fontSize: 16, fontWeight: '700', marginTop: 14},
  emptySub:   {
    color: C.muted, fontSize: 13, textAlign: 'center',
    marginTop: 6, paddingHorizontal: 24, lineHeight: 20,
  },
});
