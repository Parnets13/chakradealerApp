import React, {useState, useEffect, useCallback} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, shadow} from './theme';
import invoiceService from './services/invoiceService';

function InvoicesPage({onBack}) {
  const [searchQuery, setSearchQuery]     = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [invoices, setInvoices]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [error, setError]                 = useState(null);

  const filters = ['All', 'Paid', 'Pending', 'Overdue'];

  // ─── Fetch invoices from backend ────────────────────────────────────────────
  const fetchInvoices = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const response = await invoiceService.getInvoices();
      if (response.success) {
        setInvoices(response.data || []);
      } else {
        setError(response.message || 'Failed to load invoices');
      }
    } catch (err) {
      setError(err.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  // ─── Filter & search ─────────────────────────────────────────────────────────
  const displayed = invoices.filter(inv => {
    const matchStatus = selectedFilter === 'All' || inv.status === selectedFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q ||
      (inv.invoiceNo || '').toLowerCase().includes(q) ||
      (inv.orderNo   || '').toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  // ─── Handlers ────────────────────────────────────────────────────────────────
  const handleDownloadAll = () => {
    Alert.alert('Download All Invoices', 'Download all invoices as PDF?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Download', onPress: () => Alert.alert('Success', 'All invoices downloaded')},
    ]);
  };

  const handleViewInvoice = inv => {
    Alert.alert(
      inv.invoiceNo,
      `Order: ${inv.orderNo || 'N/A'}\nAmount: ${inv.amount}\nDue: ${inv.dueDate || 'N/A'}\nStatus: ${inv.status}`,
      [{text: 'Close'}],
    );
  };

  const handleDownloadInvoice = inv => {
    Alert.alert('Download Invoice', `Download ${inv.invoiceNo}?`, [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Download', onPress: () => {
        invoiceService.downloadInvoice(inv.id)
          .then(() => Alert.alert('Success', `${inv.invoiceNo} downloaded`))
          .catch(() => Alert.alert('Error', 'Download failed'));
      }},
    ]);
  };

  const handlePayNow = inv => {
    Alert.alert('Pay Invoice', `Pay ${inv.amount} for ${inv.invoiceNo}?`, [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Pay Now', onPress: () =>
        Alert.alert('Payment Options', 'Select method:', [
          {text: 'UPI',         onPress: () => processPayment(inv, 'UPI')},
          {text: 'Net Banking', onPress: () => processPayment(inv, 'Net Banking')},
          {text: 'Card',        onPress: () => processPayment(inv, 'Card')},
          {text: 'Cancel', style: 'cancel'},
        ]),
      },
    ]);
  };

  const processPayment = async (inv, method) => {
    try {
      const res = await invoiceService.payInvoice(inv.id, {method});
      if (res.success) {
        Alert.alert('Success', `Payment of ${inv.amount} via ${method} successful!`);
        fetchInvoices();
      } else {
        Alert.alert('Error', res.message || 'Payment failed');
      }
    } catch {
      Alert.alert('Error', 'Payment processing failed');
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Top Nav */}
      <View style={styles.topNav}>
        <Pressable onPress={onBack} style={styles.navBtn}>
          <Icon name="arrow-left" size={22} color="#FFF" />
        </Pressable>
        <View style={styles.topNavCenter}>
          <Icon name="file-document" size={20} color="#FFF" />
          <Text style={styles.topNavTitle}>Invoices</Text>
        </View>
        <Pressable onPress={handleDownloadAll} style={styles.navBtn}>
          <Icon name="download" size={22} color="#FFF" />
        </Pressable>
      </View>

      {/* Search */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Icon name="magnify" size={18} color={colors.muted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search invoice or order..."
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChips}>
        {filters.map(f => (
          <Pressable
            key={f}
            onPress={() => setSelectedFilter(f)}
            style={[styles.filterChip, selectedFilter === f && styles.filterChipActive]}>
            <Text style={[styles.filterChipText, selectedFilter === f && styles.filterChipTextActive]}>
              {f}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Loading */}
      {loading && (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.red} />
          <Text style={styles.loadingText}>Loading invoices...</Text>
        </View>
      )}

      {/* Error */}
      {error && !loading && (
        <View style={styles.centerBox}>
          <Icon name="alert-circle-outline" size={44} color={colors.red} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => fetchInvoices()}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {/* Invoice list */}
      {!loading && !error && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchInvoices(true)} colors={[colors.red]} />
          }>
          {displayed.length === 0 ? (
            <View style={styles.centerBox}>
              <Icon name="file-document-outline" size={44} color={colors.muted} />
              <Text style={styles.emptyText}>No invoices found</Text>
            </View>
          ) : (
            displayed.map(inv => (
              <InvoiceCard
                key={inv.id}
                invoice={inv}
                onView={handleViewInvoice}
                onDownload={handleDownloadInvoice}
                onPay={handlePayNow}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Invoice Card ─────────────────────────────────────────────────────────────
function InvoiceCard({invoice: inv, onView, onDownload, onPay}) {
  const canPay = inv.status === 'Pending' || inv.status === 'Overdue';
  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.invoiceNo}>{inv.invoiceNo}</Text>
          <Text style={styles.invoiceDate}>{inv.date}</Text>
        </View>
        <View style={[styles.statusBadge, {backgroundColor: (inv.statusColor || '#888') + '22'}]}>
          <Text style={[styles.statusText, {color: inv.statusColor || '#888'}]}>{inv.status}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Details */}
      <View style={styles.details}>
        {inv.orderNo ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Order No</Text>
            <Text style={styles.detailValue}>{inv.orderNo}</Text>
          </View>
        ) : null}
        {inv.dueDate ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Due Date</Text>
            <Text style={styles.detailValue}>{inv.dueDate}</Text>
          </View>
        ) : null}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Amount</Text>
          <Text style={styles.amountValue}>{inv.amount}</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable style={styles.actionBtn} onPress={() => onView(inv)}>
          <Icon name="eye-outline" size={16} color={colors.red} />
          <Text style={styles.actionBtnText}>View</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={() => onDownload(inv)}>
          <Icon name="download-outline" size={16} color={colors.red} />
          <Text style={styles.actionBtnText}>Download</Text>
        </Pressable>
        {canPay && (
          <Pressable style={[styles.actionBtn, styles.payBtn]} onPress={() => onPay(inv)}>
            <Icon name="cash" size={16} color="#FFF" />
            <Text style={styles.payBtnText}>Pay Now</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F7F7F7'},

  /* top nav */
  topNav: {
    backgroundColor: colors.red,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadow,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topNavCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  topNavTitle: {color: '#FFF', fontSize: 18, fontWeight: '800'},

  /* search */
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFF',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchInput: {flex: 1, color: colors.text, fontSize: 13, marginLeft: 8},

  /* filter chips */
  filterChips: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 6,
  },
  filterChipActive: {backgroundColor: colors.red, borderColor: colors.red},
  filterChipText: {color: colors.muted, fontSize: 12, fontWeight: '700'},
  filterChipTextActive: {color: '#FFF'},

  /* states */
  centerBox: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, minHeight: 200},
  loadingText: {marginTop: 12, color: colors.muted, fontSize: 14},
  errorText: {marginTop: 12, color: colors.red, fontSize: 14, textAlign: 'center'},
  retryBtn: {marginTop: 14, backgroundColor: colors.red, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8},
  retryText: {color: '#FFF', fontWeight: '700'},
  emptyText: {marginTop: 12, color: colors.muted, fontSize: 14},

  /* list */
  content: {padding: 16, paddingBottom: 32},

  /* card */
  card: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    padding: 14,
    marginBottom: 12,
    ...shadow,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  invoiceNo: {color: colors.text, fontSize: 15, fontWeight: '900', marginBottom: 2},
  invoiceDate: {color: colors.muted, fontSize: 12},
  statusBadge: {paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10},
  statusText: {fontSize: 11, fontWeight: '800'},
  divider: {height: 1, backgroundColor: '#F0F0F0', marginBottom: 10},
  details: {marginBottom: 10},
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailLabel: {color: colors.muted, fontSize: 12, fontWeight: '600'},
  detailValue: {color: colors.text, fontSize: 12, fontWeight: '700'},
  amountValue: {color: colors.red, fontSize: 15, fontWeight: '900'},

  /* action buttons */
  actions: {flexDirection: 'row', gap: 8},
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(198,40,40,0.08)',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(198,40,40,0.15)',
  },
  actionBtnText: {color: colors.red, fontSize: 12, fontWeight: '700'},
  payBtn: {backgroundColor: colors.red, borderColor: colors.red},
  payBtnText: {color: '#FFF', fontSize: 12, fontWeight: '700'},
});

export default InvoicesPage;
