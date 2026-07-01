import React, {useState} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
  Share,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, shadow} from './theme';

function InvoicesPage({onBack}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');

  const filters = ['All', 'Paid', 'Pending', 'Overdue'];

  const invoices = [
    {
      id: 1,
      invoiceNo: 'INV-2026-4821',
      date: '28 May 2026',
      amount: '₹42,500',
      status: 'Paid',
      statusColor: '#1D9E75',
      dueDate: '10 Jun 2026',
      orderNo: 'ORD-2026-4821',
    },
    {
      id: 2,
      invoiceNo: 'INV-2026-4803',
      date: '25 May 2026',
      amount: '₹1,18,000',
      status: 'Pending',
      statusColor: '#BA7517',
      dueDate: '08 Jun 2026',
      orderNo: 'ORD-2026-4803',
    },
    {
      id: 3,
      invoiceNo: 'INV-2026-4785',
      date: '22 May 2026',
      amount: '₹65,200',
      status: 'Paid',
      statusColor: '#1D9E75',
      dueDate: '05 Jun 2026',
      orderNo: 'ORD-2026-4785',
    },
    {
      id: 4,
      invoiceNo: 'INV-2026-4762',
      date: '18 May 2026',
      amount: '₹28,400',
      status: 'Overdue',
      statusColor: colors.red,
      dueDate: '01 Jun 2026',
      orderNo: 'ORD-2026-4762',
    },
    {
      id: 5,
      invoiceNo: 'INV-2026-4745',
      date: '15 May 2026',
      amount: '₹92,800',
      status: 'Paid',
      statusColor: '#1D9E75',
      dueDate: '29 May 2026',
      orderNo: 'ORD-2026-4745',
    },
  ];

  const filteredInvoices = selectedFilter === 'All'
    ? invoices
    : invoices.filter(inv => inv.status === selectedFilter);

  const searchFilteredInvoices = searchQuery
    ? filteredInvoices.filter(inv =>
        inv.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.orderNo.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredInvoices;

  const handleDownloadAll = () => {
    Alert.alert(
      'Download All Invoices',
      'Download all invoices as PDF?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Download',
          onPress: () => {
            Alert.alert('Success', 'All invoices downloaded successfully');
          },
        },
      ]
    );
  };

  const handleViewInvoice = (invoice) => {
    Alert.alert(
      'View Invoice',
      `Opening invoice ${invoice.invoiceNo}\n\nOrder: ${invoice.orderNo}\nAmount: ${invoice.amount}\nStatus: ${invoice.status}`,
      [{text: 'Close'}]
    );
  };

  const handleDownloadInvoice = async (invoice) => {
    try {
      Alert.alert(
        'Download Invoice',
        `Downloading ${invoice.invoiceNo}...`,
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Download',
            onPress: () => {
              // Simulate download
              setTimeout(() => {
                Alert.alert('Success', `Invoice ${invoice.invoiceNo} downloaded successfully`);
              }, 500);
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to download invoice');
    }
  };

  const handlePayNow = (invoice) => {
    Alert.alert(
      'Pay Invoice',
      `Pay ${invoice.amount} for invoice ${invoice.invoiceNo}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Pay Now',
          onPress: () => {
            Alert.alert(
              'Payment Options',
              'Select payment method:',
              [
                {text: 'UPI', onPress: () => processPayment(invoice, 'UPI')},
                {text: 'Net Banking', onPress: () => processPayment(invoice, 'Net Banking')},
                {text: 'Card', onPress: () => processPayment(invoice, 'Card')},
                {text: 'Cancel', style: 'cancel'},
              ]
            );
          },
        },
      ]
    );
  };

  const processPayment = (invoice, method) => {
    Alert.alert(
      'Processing Payment',
      `Processing payment of ${invoice.amount} via ${method}...`,
      [{text: 'OK'}]
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Navigation Bar */}
      <View style={styles.topNav}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#FFFFFF" />
        </Pressable>
        <View style={styles.topNavCenter}>
          <Icon name="file-document" size={24} color="#FFFFFF" />
          <Text style={styles.topNavTitle}>Invoices</Text>
        </View>
        <Pressable onPress={handleDownloadAll} style={styles.downloadBtn}>
          <Icon name="download" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Icon name="magnify" size={20} color={colors.muted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search invoice or order..."
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={20} color={colors.muted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChips}>
        {filters.map((filter, index) => (
          <Pressable
            key={index}
            onPress={() => setSelectedFilter(filter)}
            style={[
              styles.filterChip,
              selectedFilter === filter && styles.filterChipActive,
            ]}>
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === filter && styles.filterChipTextActive,
              ]}>
              {filter}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}>
        {searchFilteredInvoices.map(invoice => (
          <View key={invoice.id} style={styles.invoiceCard}>
            <View style={styles.invoiceHeader}>
              <View>
                <Text style={styles.invoiceNo}>{invoice.invoiceNo}</Text>
                <Text style={styles.invoiceDate}>{invoice.date}</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  {backgroundColor: invoice.statusColor + '20'},
                ]}>
                <Text style={[styles.statusText, {color: invoice.statusColor}]}>
                  {invoice.status}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.invoiceDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Order No:</Text>
                <Text style={styles.detailValue}>{invoice.orderNo}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Due Date:</Text>
                <Text style={styles.detailValue}>{invoice.dueDate}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Amount:</Text>
                <Text style={styles.amountValue}>{invoice.amount}</Text>
              </View>
            </View>

            <View style={styles.invoiceActions}>
              <Pressable
                style={styles.actionBtn}
                onPress={() => handleViewInvoice(invoice)}>
                <Icon name="eye-outline" size={18} color={colors.red} />
                <Text style={styles.actionBtnText}>View</Text>
              </Pressable>
              <Pressable
                style={styles.actionBtn}
                onPress={() => handleDownloadInvoice(invoice)}>
                <Icon name="download-outline" size={18} color={colors.red} />
                <Text style={styles.actionBtnText}>Download</Text>
              </Pressable>
              {invoice.status === 'Pending' && (
                <Pressable
                  style={[styles.actionBtn, styles.actionBtnPrimary]}
                  onPress={() => handlePayNow(invoice)}>
                  <Icon name="cash" size={18} color="#FFFFFF" />
                  <Text style={styles.actionBtnTextPrimary}>Pay Now</Text>
                </Pressable>
              )}
              {invoice.status === 'Overdue' && (
                <Pressable
                  style={[styles.actionBtn, styles.actionBtnPrimary]}
                  onPress={() => handlePayNow(invoice)}>
                  <Icon name="alert-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.actionBtnTextPrimary}>Pay Now</Text>
                </Pressable>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topNav: {
    backgroundColor: colors.red,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadow,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topNavCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  topNavLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topNavTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  downloadBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: colors.line,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    marginLeft: 10,
  },
  filterChips: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: colors.line,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: colors.red,
    borderColor: colors.red,
  },
  filterChipText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  content: {
    padding: 20,
    paddingTop: 8,
  },
  invoiceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    marginBottom: 12,
    ...shadow,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  invoiceNo: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },
  invoiceDate: {
    color: colors.muted,
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginBottom: 12,
  },
  invoiceDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  detailValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  amountValue: {
    color: colors.red,
    fontSize: 16,
    fontWeight: '900',
  },
  invoiceActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(198, 40, 40, 0.1)',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(198, 40, 40, 0.2)',
  },
  actionBtnPrimary: {
    backgroundColor: colors.red,
    borderColor: colors.red,
  },
  actionBtnText: {
    color: colors.red,
    fontSize: 13,
    fontWeight: '700',
  },
  actionBtnTextPrimary: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default InvoicesPage;
