import React, {useState, useEffect, useCallback} from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, shadow} from './theme';
import invoiceService from './services/invoiceService';
import apiService from './services/apiService';

// ─── format currency ──────────────────────────────────────────────────────────
const fmt = n =>
  typeof n === 'number'
    ? `₹${n.toLocaleString('en-IN', {maximumFractionDigits: 0})}`
    : '₹0';

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FinanceLedgerSection({onBack}) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [invoices, setInvoices]         = useState([]);
  const [summary, setSummary]           = useState(null);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [error, setError]               = useState(null);

  // ── fetch both invoice list + summary in parallel ──────────────────────────
  const fetchAll = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);

      const [invRes, sumRes] = await Promise.allSettled([
        invoiceService.getInvoices(),
        apiService.get('/finance/summary'),
      ]);

      if (invRes.status === 'fulfilled' && invRes.value?.success) {
        setInvoices(invRes.value.data || []);
      } else if (invRes.status === 'rejected') {
        console.warn('invoices fetch failed:', invRes.reason?.message);
      }

      if (sumRes.status === 'fulfilled' && sumRes.value?.success) {
        setSummary(sumRes.value.data);
      } else if (sumRes.status === 'rejected') {
        console.warn('summary fetch failed:', sumRes.reason?.message);
      }
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── build transaction rows from invoice list ───────────────────────────────
  const allTransactions = invoices.map(inv => {
    const isPaid    = inv.status === 'Paid';
    const isOverdue = inv.status === 'Overdue';
    const isPartial = inv.status === 'Partial';

    return {
      id:          String(inv.id),
      type:        isPaid ? 'Payment' : 'Invoice',
      typeColor:   isPaid ? '#1D9E75' : '#1976D2',
      typeBg:      isPaid ? '#E8F5F0' : '#E3F2FD',
      title:       inv.invoiceNo,
      date:        inv.date        || '—',
      dueDate:     inv.dueDate     || '',
      description: inv.orderNo     ? `Order: ${inv.orderNo}` : (inv.partyName || 'Invoice'),
      amount:      isPaid ? `+${inv.amount}` : `-${inv.amount}`,
      remaining:   inv.remainingFmt || inv.amount,
      amountColor: isPaid ? '#1D9E75' : isOverdue ? '#C62828' : colors.red,
      status:      inv.status,
      statusColor: inv.statusColor || '#888',
      statusBg:    (inv.statusColor || '#888') + '22',
      isOverdue,
      isPartial,
      rawInv:      inv,
    };
  });

  const filteredTx =
    activeFilter === 'All'      ? allTransactions :
    activeFilter === 'Invoices' ? allTransactions.filter(t => t.type === 'Invoice') :
    activeFilter === 'Payments' ? allTransactions.filter(t => t.type === 'Payment') :
    activeFilter === 'Overdue'  ? allTransactions.filter(t => t.isOverdue) :
    allTransactions;

  // ── derived numbers ────────────────────────────────────────────────────────
  const outstanding    = summary?.outstanding    ?? 0;
  const totalPurchases = summary?.totalPurchases ?? 0;
  const creditNotes    = summary?.creditNotes    ?? 0;
  const progressPct    = summary?.progressPct    ?? 0;
  const daysLeft       = summary?.daysLeft       ?? null;
  const nextDueDate    = summary?.nextDueDate     ?? null;
  const totalInvoices  = summary?.totalInvoices  ?? invoices.length;
  const paidInvoices   = summary?.paidInvoices   ?? 0;
  const pendingInvoices= summary?.pendingInvoices ?? 0;

  // ── handlers ───────────────────────────────────────────────────────────────
  const handlePayNow = () => {
    if (!outstanding) {
      Alert.alert('No Outstanding', 'All invoices are paid. 🎉');
      return;
    }
    Alert.alert('Pay Outstanding Amount', `Pay ${fmt(outstanding)} now?`, [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Pay Now', onPress: () => Alert.alert('Processing', 'Payment initiated. You will be notified shortly.')},
    ]);
  };

  const handleExportPDF = () =>
    Alert.alert('Export PDF', 'Exporting your transaction history as PDF...');

  // ── loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={s.container}>
        <TopNav onBack={onBack} />
        <View style={s.centerBox}>
          <ActivityIndicator size="large" color={colors.red} />
          <Text style={s.loadingText}>Loading finance data...</Text>
        </View>
      </View>
    );
  }

  // ── main render ────────────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      <TopNav onBack={onBack} onExport={handleExportPDF} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchAll(true)}
            colors={[colors.red]}
            tintColor={colors.red}
          />
        }>

        {/* ── Outstanding Header Card ─────────────────────────────────────── */}
        <View style={s.headerCard}>
          <Text style={s.headerLabel}>OUTSTANDING AMOUNT</Text>
          <Text style={s.headerAmount}>{fmt(outstanding)}</Text>

          {/* due info */}
          {nextDueDate ? (
            <View style={s.dueRow}>
              <View style={s.dueLeft}>
                <Icon name="calendar-clock" size={14} color="rgba(255,255,255,0.85)" />
                <Text style={s.dueText}>
                  Due: {nextDueDate}
                  {daysLeft != null
                    ? daysLeft > 0
                      ? `  ·  ${daysLeft}d left`
                      : daysLeft === 0
                        ? '  ·  Due today'
                        : `  ·  ${Math.abs(daysLeft)}d overdue`
                    : ''}
                </Text>
              </View>
              <View style={s.pctBadge}>
                <Text style={s.pctText}>{progressPct}%</Text>
              </View>
            </View>
          ) : null}

          {/* progress bar */}
          <View style={s.progressBar}>
            <View style={[s.progressFill, {width: `${Math.min(progressPct, 100)}%`}]} />
          </View>

          {/* 3 mini stat boxes */}
          <View style={s.statRow}>
            <View style={s.statBox}>
              <Text style={s.statLabel}>TOTAL</Text>
              <Text style={s.statValue}>{fmt(totalPurchases)}</Text>
              <Text style={s.statSub}>Purchases</Text>
            </View>
            <View style={[s.statBox, s.statBoxMid]}>
              <Text style={s.statLabel}>INVOICES</Text>
              <Text style={s.statValue}>{totalInvoices}</Text>
              <Text style={s.statSub}>{paidInvoices} paid · {pendingInvoices} due</Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statLabel}>CREDIT</Text>
              <Text style={[s.statValue, {color: '#A5D6A7'}]}>{fmt(creditNotes)}</Text>
              <Text style={s.statSub}>Available</Text>
            </View>
          </View>
        </View>

        {/* ── Filter chips ─────────────────────────────────────────────────── */}
        <View style={s.filterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
            {['All', 'Invoices', 'Payments', 'Overdue'].map(f => (
              <Pressable
                key={f}
                onPress={() => setActiveFilter(f)}
                style={[s.chip, activeFilter === f && s.chipActive]}>
                <Text style={[s.chipText, activeFilter === f && s.chipTextActive]}>{f}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* ── History header ─────────────────────────────────────────────── */}
        <View style={s.historyHeader}>
          <Text style={s.historyTitle}>Transaction History</Text>
          <Pressable onPress={handleExportPDF}>
            <Text style={s.exportText}>Export PDF</Text>
          </Pressable>
        </View>

        {/* ── Error ─────────────────────────────────────────────────────── */}
        {error ? (
          <View style={s.centerBox}>
            <Icon name="alert-circle-outline" size={40} color={colors.red} />
            <Text style={s.errorText}>{error}</Text>
            <Pressable style={s.retryBtn} onPress={() => fetchAll()}>
              <Text style={s.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : filteredTx.length === 0 ? (
          <View style={s.centerBox}>
            <Icon name="file-document-outline" size={40} color={colors.muted} />
            <Text style={s.emptyText}>No transactions found</Text>
          </View>
        ) : (
          filteredTx.map(t => <TxCard key={t.id} tx={t} />)
        )}

        <View style={{height: 90}} />
      </ScrollView>

      {/* ── Pay Now sticky footer ─────────────────────────────────────────── */}
      {outstanding > 0 && (
        <View style={s.payBar}>
          <Pressable style={s.payBtn} onPress={handlePayNow}>
            <Icon name="credit-card-outline" size={18} color="#FFF" />
            <Text style={s.payText}>Pay Now — {fmt(outstanding)}</Text>
            <Icon name="chevron-right" size={16} color="#FFF" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ─── Top Nav ──────────────────────────────────────────────────────────────────
function TopNav({onBack, onExport}) {
  return (
    <View style={s.topNav}>
      <Pressable style={s.navBtn} onPress={onBack}>
        <Icon name="arrow-left" size={22} color="#FFF" />
      </Pressable>
      <View style={s.navCenter}>
        <Icon name="chart-line" size={18} color="#FFF" />
        <Text style={s.navTitle}>Finance & Ledger</Text>
      </View>
      {onExport ? (
        <Pressable style={s.navBtn} onPress={onExport}>
          <Icon name="download" size={20} color="#FFF" />
        </Pressable>
      ) : (
        <View style={s.navBtn} />
      )}
    </View>
  );
}

// ─── Transaction Card ─────────────────────────────────────────────────────────
function TxCard({tx}) {
  return (
    <View style={s.txCard}>
      {/* top row: type badge + amount */}
      <View style={s.txTop}>
        <View style={[s.typeBadge, {backgroundColor: tx.typeBg}]}>
          <Text style={[s.typeText, {color: tx.typeColor}]}>{tx.type}</Text>
        </View>
        <Text style={[s.txAmount, {color: tx.amountColor}]}>{tx.amount}</Text>
      </View>

      {/* invoice number */}
      <Text style={s.txTitle}>{tx.title}</Text>

      {/* date + description */}
      <Text style={s.txDesc}>
        {tx.date}{tx.description ? `  ·  ${tx.description}` : ''}
      </Text>

      {/* due date (if pending/overdue) */}
      {tx.dueDate && tx.type === 'Invoice' ? (
        <View style={s.txDueRow}>
          <Icon name="calendar-alert" size={12} color={tx.isOverdue ? '#C62828' : colors.muted} />
          <Text style={[s.txDueText, tx.isOverdue && {color: '#C62828'}]}>
            Due: {tx.dueDate}
            {tx.type === 'Invoice' && tx.remaining && tx.status !== 'Paid'
              ? `  ·  Balance: ${tx.remaining}` : ''}
          </Text>
        </View>
      ) : null}

      {/* status badge */}
      <View style={[s.statusBadge, {backgroundColor: tx.statusBg}]}>
        <Text style={[s.statusText, {color: tx.statusColor}]}>{tx.status}</Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:   {flex: 1, backgroundColor: '#F5F5F5'},
  scrollContent:{paddingBottom: 16},

  // ── nav
  topNav: {
    backgroundColor: colors.red,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadow,
  },
  navBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  navCenter: {flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center'},
  navTitle:  {color: '#FFF', fontSize: 17, fontWeight: '800'},

  // ── header card
  headerCard: {
    backgroundColor: colors.red,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
  },
  headerLabel: {
    color: 'rgba(255,255,255,0.8)', fontSize: 10,
    fontWeight: '700', letterSpacing: 1.2, marginBottom: 4,
  },
  headerAmount: {color: '#FFF', fontSize: 34, fontWeight: '900', marginBottom: 10},
  dueRow:       {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10},
  dueLeft:      {flexDirection: 'row', alignItems: 'center', gap: 5},
  dueText:      {color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600'},
  pctBadge:     {backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8},
  pctText:      {color: '#FFF', fontSize: 12, fontWeight: '800'},
  progressBar:  {height: 5, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, overflow: 'hidden', marginBottom: 14},
  progressFill: {height: '100%', backgroundColor: '#FFF', borderRadius: 3},

  // ── 3-box stat row
  statRow:   {flexDirection: 'row', gap: 8},
  statBox:   {flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 10},
  statBoxMid:{},
  statLabel: {color: 'rgba(255,255,255,0.65)', fontSize: 8, fontWeight: '700', letterSpacing: 0.8, marginBottom: 3},
  statValue: {color: '#FFF', fontSize: 14, fontWeight: '900', marginBottom: 1},
  statSub:   {color: 'rgba(255,255,255,0.75)', fontSize: 9, fontWeight: '600'},

  // ── filter bar
  filterBar: {
    backgroundColor: '#FFF', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#EBEBEB',
  },
  filterRow:     {paddingHorizontal: 16, gap: 8},
  chip:          {paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, backgroundColor: '#F2F2F2', marginRight: 6},
  chipActive:    {backgroundColor: colors.red},
  chipText:      {fontSize: 12, fontWeight: '700', color: '#757575'},
  chipTextActive:{color: '#FFF'},

  // ── history header
  historyHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF',
  },
  historyTitle: {fontSize: 14, fontWeight: '900', color: '#212121'},
  exportText:   {fontSize: 12, fontWeight: '700', color: colors.red},

  // ── transaction card
  txCard: {
    backgroundColor: '#FFF', borderRadius: 12,
    padding: 14, marginHorizontal: 16, marginTop: 10,
    ...shadow,
  },
  txTop:     {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6},
  typeBadge: {paddingHorizontal: 9, paddingVertical: 3, borderRadius: 7},
  typeText:  {fontSize: 11, fontWeight: '800'},
  txAmount:  {fontSize: 17, fontWeight: '900'},
  txTitle:   {fontSize: 14, fontWeight: '900', color: '#212121', marginBottom: 2},
  txDesc:    {fontSize: 12, color: '#757575', marginBottom: 6},
  txDueRow:  {flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8},
  txDueText: {fontSize: 11, color: '#757575', fontWeight: '600'},
  statusBadge:{alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 7},
  statusText: {fontSize: 11, fontWeight: '800'},

  // ── pay now bar
  payBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EBEBEB',
    ...shadow,
  },
  payBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: colors.red,
    paddingVertical: 12, borderRadius: 12,
  },
  payText: {color: '#FFF', fontSize: 15, fontWeight: '800'},

  // ── states
  centerBox:   {alignItems: 'center', justifyContent: 'center', padding: 32, minHeight: 160},
  loadingText: {marginTop: 10, color: '#757575', fontSize: 14},
  emptyText:   {marginTop: 10, color: '#757575', fontSize: 14},
  errorText:   {marginTop: 10, color: colors.red, fontSize: 14, textAlign: 'center'},
  retryBtn:    {marginTop: 12, backgroundColor: colors.red, paddingHorizontal: 22, paddingVertical: 9, borderRadius: 8},
  retryText:   {color: '#FFF', fontWeight: '700'},

  // muted ref (used in txDueRow)
  muted: {color: '#757575'},
});
