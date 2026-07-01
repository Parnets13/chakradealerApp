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
  orange: '#FF6F00',
};

const shadow = {
  shadowColor: '#000',
  shadowOpacity: 0.1,
  shadowRadius: 8,
  shadowOffset: {width: 0, height: 2},
  elevation: 3,
};

function ReturnsPage() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [expandedCard, setExpandedCard] = useState(null);

  const returns = [
    {
      id: 'RTN-2026-041',
      reason: 'Damaged packaging',
      units: '12 units',
      amount: '₹14,820',
      status: 'In Transit',
      statusColor: '#BA7517',
      statusBg: '#FFF8E1',
      docket: 'DKT-BLR-9942',
      courier: 'Delhivery',
      timeline: [
        {label: 'Return raised', time: '24 May · 10:00 AM', completed: true},
        {label: 'Pickup confirmed by courier', time: '25 May · 2:30 PM', completed: true},
        {label: 'In transit to warehouse', time: 'Est. arrival: 30 May', completed: true, active: true},
        {label: 'QC inspection at warehouse', time: 'Pending', completed: false},
        {label: 'Credit note issuance', time: 'Pending', completed: false},
      ],
    },
    {
      id: 'RTN-2026-038',
      reason: 'Wrong product received',
      units: '6 units',
      amount: '₹18,400',
      status: 'Closed',
      statusColor: colors.green,
      statusBg: '#E8F5F0',
      docket: 'DKT-BLR-9108',
      courier: 'India Post',
      creditNote: 'CN-2026-218',
      creditAmount: '₹18,400',
      timeline: [
        {label: 'Return raised', time: '14 May · 11:00 AM', completed: true},
        {label: 'Material received at warehouse', time: '18 May · 3:00 PM', completed: true},
        {label: 'QC verified — approved', time: '19 May · 10:30 AM', completed: true},
        {label: 'Credit note issued', time: '20 May · 2:00 PM', completed: true, active: true},
      ],
    },
    {
      id: 'RTN-2026-035',
      reason: 'Expired product',
      units: '8 units',
      amount: '₹9,600',
      status: 'In Transit',
      statusColor: '#BA7517',
      statusBg: '#FFF8E1',
      docket: 'DKT-BLR-9876',
      courier: 'BlueDart',
      timeline: [
        {label: 'Return raised', time: '22 May · 9:00 AM', completed: true},
        {label: 'Pickup confirmed by courier', time: '23 May · 11:00 AM', completed: true},
        {label: 'In transit to warehouse', time: 'Est. arrival: 28 May', completed: true, active: true},
        {label: 'QC inspection at warehouse', time: 'Pending', completed: false},
        {label: 'Credit note issuance', time: 'Pending', completed: false},
      ],
    },
    {
      id: 'RTN-2026-029',
      reason: 'Quality issue',
      units: '15 units',
      amount: '₹22,500',
      status: 'Closed',
      statusColor: colors.green,
      statusBg: '#E8F5F0',
      docket: 'DKT-BLR-9654',
      courier: 'DTDC',
      creditNote: 'CN-2026-195',
      creditAmount: '₹22,500',
      timeline: [
        {label: 'Return raised', time: '10 May · 2:00 PM', completed: true},
        {label: 'Material received at warehouse', time: '12 May · 4:00 PM', completed: true},
        {label: 'QC verified — approved', time: '13 May · 11:00 AM', completed: true},
        {label: 'Credit note issued', time: '14 May · 3:30 PM', completed: true, active: true},
      ],
    },
  ];

  const filteredReturns = activeFilter === 'All'
    ? returns
    : activeFilter === 'In Transit'
    ? returns.filter(r => r.status === 'In Transit')
    : returns.filter(r => r.status === 'Closed');

  const stats = {
    total: returns.length,
    inTransit: returns.filter(r => r.status === 'In Transit').length,
    closed: returns.filter(r => r.status === 'Closed').length,
  };

  const latestCreditNote = {
    number: 'CN-2026-218',
    amount: '₹18,400',
    date: '20 May 2026',
  };

  const handleNewReturn = () => {
    Alert.alert(
      'Raise New Return Request',
      'Select order to raise return request',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Continue', onPress: () => console.log('New return')},
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Navigation */}
      <View style={styles.topNav}>
        <View style={styles.topNavLeft}>
          <Pressable style={styles.backBtn}>
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.topNavTitle}>Returns</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={handleNewReturn}>
          <Icon name="plus" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Stats Section */}
      <View style={styles.statsSection}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total returns</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, {color: colors.red}]}>{stats.inTransit}</Text>
          <Text style={styles.statLabel}>In transit</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, {color: colors.green}]}>{stats.closed}</Text>
          <Text style={styles.statLabel}>Closed</Text>
        </View>
      </View>

      {/* Credit Note Banner */}
      <View style={styles.creditBanner}>
        <Icon name="check-circle" size={24} color={colors.green} />
        <View style={styles.creditBannerText}>
          <Text style={styles.creditBannerTitle}>
            Credit note {latestCreditNote.number} applied
          </Text>
          <Text style={styles.creditBannerSubtitle}>
            {latestCreditNote.amount} added to your ledger · {latestCreditNote.date}
          </Text>
        </View>
      </View>

      {/* Active Returns Section */}
      <View style={styles.activeReturnsHeader}>
        <Text style={styles.activeReturnsTitle}>Active returns</Text>
        <View style={styles.filterChips}>
          {['All', 'In Transit', 'Closed'].map(filter => (
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
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}>
        {filteredReturns.map(returnItem => (
          <ReturnCard
            key={returnItem.id}
            returnItem={returnItem}
            expanded={expandedCard === returnItem.id}
            onToggle={() =>
              setExpandedCard(expandedCard === returnItem.id ? null : returnItem.id)
            }
          />
        ))}
      </ScrollView>
    </View>
  );
}

function ReturnCard({returnItem, expanded, onToggle}) {
  return (
    <View style={styles.returnCard}>
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <Text style={styles.returnId}>{returnItem.id}</Text>
        <View style={[styles.statusBadge, {backgroundColor: returnItem.statusBg}]}>
          <Text style={[styles.statusText, {color: returnItem.statusColor}]}>
            {returnItem.status}
          </Text>
        </View>
      </View>

      <Text style={styles.returnDetails}>
        {returnItem.reason} · {returnItem.units} · {returnItem.amount}
      </Text>

      <Text style={styles.docketInfo}>
        Docket: <Text style={styles.docketBold}>{returnItem.docket}</Text> · {returnItem.courier}
      </Text>

      {/* Timeline - Show first 3 or all based on expanded state */}
      <View style={styles.timeline}>
        {returnItem.timeline.slice(0, expanded ? returnItem.timeline.length : 3).map((step, index) => (
          <View key={index} style={styles.timelineStep}>
            <View
              style={[
                styles.timelineDot,
                step.completed && styles.timelineDotCompleted,
                step.active && styles.timelineDotActive,
              ]}
            />
            {index < (expanded ? returnItem.timeline.length : 3) - 1 && (
              <View
                style={[
                  styles.timelineLine,
                  step.completed && styles.timelineLineCompleted,
                ]}
              />
            )}
            <View style={styles.timelineContent}>
              <Text
                style={[
                  styles.timelineLabel,
                  step.active && styles.timelineLabelActive,
                ]}>
                {step.label}
              </Text>
              <Text style={styles.timelineTime}>{step.time}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Credit Note Info */}
      {returnItem.creditNote && expanded && (
        <View style={styles.creditNoteBox}>
          <Icon name="check-circle" size={20} color={colors.green} />
          <View style={styles.creditNoteInfo}>
            <Text style={styles.creditNoteText}>
              Credit Note: {returnItem.creditNote}
            </Text>
            <Text style={styles.creditNoteAmount}>{returnItem.creditAmount} applied to ledger</Text>
          </View>
        </View>
      )}

      {/* Expand Button */}
      <Pressable style={styles.expandBtn} onPress={onToggle}>
        <Text style={styles.expandBtnText}>
          {expanded ? 'Show Less' : 'View Details'}
        </Text>
        <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.red} />
      </Pressable>
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
    fontSize: 24,
    fontWeight: '900',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsSection: {
    flexDirection: 'row',
    backgroundColor: colors.red,
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '600',
    textAlign: 'center',
  },
  creditBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D4F4E8',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  creditBannerText: {
    flex: 1,
  },
  creditBannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A5D42',
    marginBottom: 4,
  },
  creditBannerSubtitle: {
    fontSize: 14,
    color: '#2D7A5F',
    fontWeight: '600',
  },
  raiseReturnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFEBEE',
    marginHorizontal: 20,
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.red,
    borderStyle: 'dashed',
  },
  raiseReturnText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.red,
  },
  activeReturnsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  activeReturnsTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
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
  content: {
    padding: 20,
    paddingTop: 8,
  },
  returnCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    ...shadow,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  returnId: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
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
  returnDetails: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 8,
  },
  docketInfo: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 16,
  },
  docketBold: {
    fontWeight: '800',
    color: colors.text,
  },
  timeline: {
    paddingLeft: 8,
    marginBottom: 16,
  },
  timelineStep: {
    flexDirection: 'row',
    position: 'relative',
    marginBottom: 4,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
    marginRight: 16,
    marginTop: 4,
    zIndex: 2,
  },
  timelineDotCompleted: {
    backgroundColor: colors.green,
  },
  timelineDotActive: {
    backgroundColor: colors.red,
  },
  timelineLine: {
    position: 'absolute',
    left: 7,
    top: 20,
    width: 2,
    height: 32,
    backgroundColor: '#E0E0E0',
  },
  timelineLineCompleted: {
    backgroundColor: colors.green,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 16,
  },
  timelineLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  timelineLabelActive: {
    color: colors.red,
    fontWeight: '900',
  },
  timelineTime: {
    fontSize: 13,
    color: colors.muted,
  },
  creditNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5F0',
    padding: 12,
    borderRadius: 12,
    gap: 12,
    marginBottom: 12,
  },
  creditNoteInfo: {
    flex: 1,
  },
  creditNoteText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  creditNoteAmount: {
    fontSize: 13,
    color: colors.green,
    fontWeight: '800',
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  expandBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.red,
  },
});

export default ReturnsPage;
