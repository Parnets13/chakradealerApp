import React, {useState} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const colors = {
  red: '#C62828',
  text: '#212121',
  muted: '#757575',
  green: '#1D9E75',
};

const shadow = {
  shadowColor: '#000',
  shadowOpacity: 0.1,
  shadowRadius: 8,
  shadowOffset: {width: 0, height: 2},
  elevation: 3,
};

function FinanceLedgerSection({onBack}) {
  const [activeFilter, setActiveFilter] = useState('All');

  const transactions = [
    {
      id: 1,
      type: 'Invoice',
      typeColor: '#1976D2',
      typeBg: '#E3F2FD',
      title: 'INV-2026-4821',
      date: '29 May 2026',
      description: 'Coconut Oil 1L ×48',
      amount: '-₹42,500',
      amountColor: colors.red,
      status: 'Unpaid',
      statusColor: '#BA7517',
      statusBg: '#FFF8E1',
    },
    {
      id: 2,
      type: 'Payment',
      typeColor: colors.green,
      typeBg: '#E8F5F0',
      title: 'NEFT — HDFC Bank',
      date: '22 May 2026',
      description: 'Ref: TXN88420',
      amount: '+₹80,000',
      amountColor: colors.green,
      status: 'Confirmed',
      statusColor: colors.green,
      statusBg: '#E8F5F0',
    },
    {
      id: 3,
      type: 'Invoice',
      typeColor: '#1976D2',
      typeBg: '#E3F2FD',
      title: 'INV-2026-4803',
      date: '28 May 2026',
      description: 'Mixed SKU Bulk',
      amount: '-₹1,18,000',
      amountColor: colors.red,
      status: 'Unpaid',
      statusColor: '#BA7517',
      statusBg: '#FFF8E1',
    },
    {
      id: 4,
      type: 'Credit Note',
      typeColor: '#C62828',
      typeBg: '#FFEBEE',
      title: 'CN-2026-218',
      date: '20 May 2026',
      description: 'Return adjustment',
      amount: '+₹18,400',
      amountColor: colors.green,
      status: 'Applied',
      statusColor: colors.green,
      statusBg: '#E8F5F0',
    },
    {
      id: 5,
      type: 'Payment',
      typeColor: colors.green,
      typeBg: '#E8F5F0',
      title: 'UPI — Kumar Traders',
      date: '10 May 2026',
      description: 'Ref: UPI4418',
      amount: '+₹50,000',
      amountColor: colors.green,
      status: 'Confirmed',
      statusColor: colors.green,
      statusBg: '#E8F5F0',
    },
  ];

  const filteredTransactions = activeFilter === 'All'
    ? transactions
    : activeFilter === 'Invoices'
    ? transactions.filter(t => t.type === 'Invoice')
    : activeFilter === 'Payments'
    ? transactions.filter(t => t.type === 'Payment')
    : activeFilter === 'Credit Notes'
    ? transactions.filter(t => t.type === 'Credit Note')
    : transactions.filter(t => t.type === 'Debit');

  const handleExportPDF = () => {
    Alert.alert(
      'Export PDF',
      'Download transaction history as PDF?',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Download', onPress: () => console.log('Exporting PDF')},
      ]
    );
  };

  const handlePayNow = () => {
    Alert.alert(
      'Pay Outstanding Amount',
      'Pay ₹2,45,000 now?',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Pay Now', onPress: () => console.log('Processing payment')},
      ]
    );
  };

  const handleDownload = () => {
    Alert.alert('Download', 'Downloading statement...');
  };

  const handleFilter = () => {
    Alert.alert('Filter', 'Filter options coming soon');
  };

  return (
    <View style={styles.container}>
      {/* Top Navigation */}
      <View style={styles.topNav}>
        <View style={styles.topNavLeft}>
          <Pressable style={styles.backBtn} onPress={onBack}>
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.topNavTitle}>Finance & Ledger</Text>
        </View>
        <View style={styles.topNavRight}>
          <Pressable style={styles.iconBtn} onPress={handleDownload}>
            <Icon name="download" size={24} color="#FFFFFF" />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={handleFilter}>
            <Icon name="filter-variant" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* Outstanding Amount Section */}
      <View style={styles.outstandingSection}>
        <Text style={styles.outstandingLabel}>OUTSTANDING AMOUNT</Text>
        <Text style={styles.outstandingAmount}>₹2,45,000</Text>
        <View style={styles.dueInfo}>
          <Text style={styles.dueText}>Due: 10 Jun 2026 · 12 days left</Text>
          <View style={styles.percentBadge}>
            <Text style={styles.percentText}>49%</Text>
          </View>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, {width: '49%'}]} />
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>TOTAL PURCHASES</Text>
            <Text style={styles.summaryValue}>FY 2025-26</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>CREDIT NOTES</Text>
            <Text style={[styles.summaryValue, {color: colors.green}]}>₹18,400</Text>
            <Text style={styles.summarySubtext}>Available to use</Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}>
          {['All', 'Invoices', 'Payments', 'Credit Notes', 'Debit'].map(filter => (
            <Pressable
              key={filter}
              onPress={() => setActiveFilter(filter)}
              style={[
                styles.filterChip,
                activeFilter === filter && styles.filterChipActive,
              ]}>
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === filter && styles.filterChipTextActive,
                ]}>
                {filter}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Transaction History */}
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>Transaction history</Text>
        <Pressable onPress={handleExportPDF}>
          <Text style={styles.exportText}>Export PDF</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}>
        {filteredTransactions.map(transaction => (
          <TransactionCard key={transaction.id} transaction={transaction} />
        ))}
      </ScrollView>

      {/* Pay Now Button */}
      <View style={styles.payNowContainer}>
        <Pressable style={styles.payNowBtn} onPress={handlePayNow}>
          <Icon name="credit-card" size={24} color="#FFFFFF" />
          <Text style={styles.payNowText}>Pay Now — ₹2,45,000</Text>
          <Icon name="arrow-down" size={24} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

function TransactionCard({transaction}) {
  return (
    <View style={styles.transactionCard}>
      <View style={styles.transactionHeader}>
        <View style={[styles.typeBadge, {backgroundColor: transaction.typeBg}]}>
          <Text style={[styles.typeText, {color: transaction.typeColor}]}>
            {transaction.type}
          </Text>
        </View>
        <Text style={[styles.transactionAmount, {color: transaction.amountColor}]}>
          {transaction.amount}
        </Text>
      </View>

      <Text style={styles.transactionTitle}>{transaction.title}</Text>
      <Text style={styles.transactionDescription}>
        {transaction.date} · {transaction.description}
      </Text>

      <View style={[styles.statusBadge, {backgroundColor: transaction.statusBg}]}>
        <Text style={[styles.statusText, {color: transaction.statusColor}]}>
          {transaction.status}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
  topNavLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topNavTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  topNavRight: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outstandingSection: {
    backgroundColor: colors.red,
    padding: 20,
    paddingBottom: 24,
  },
  outstandingLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  outstandingAmount: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '900',
    marginBottom: 12,
  },
  dueInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dueText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
  },
  percentBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  percentText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  summarySubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
  filterSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterRow: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: colors.red,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
  },
  exportText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.red,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  transactionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...shadow,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  transactionAmount: {
    fontSize: 20,
    fontWeight: '900',
  },
  transactionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 4,
  },
  transactionDescription: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 12,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  payNowContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    ...shadow,
  },
  payNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.red,
    paddingVertical: 16,
    borderRadius: 16,
  },
  payNowText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
});

export default FinanceLedgerSection;
