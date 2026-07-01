import React, {useState} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Linking,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const colors = {
  red: '#C62828',
  text: '#212121',
  muted: '#757575',
  orange: '#FF6F00',
};

const shadow = {
  shadowColor: '#000',
  shadowOpacity: 0.1,
  shadowRadius: 8,
  shadowOffset: {width: 0, height: 2},
  elevation: 3,
};

function DispatchTrackingPage({onBack}) {
  const [activeFilter, setActiveFilter] = useState('All Orders');
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filters = ['All Orders', 'In Transit', 'Delivered', 'Pending'];

  const shipments = [
    {
      id: 'ORD-2026-4821',
      product: 'Coconut Oil 1L',
      units: '48 units',
      amount: '₹42,500',
      status: 'In Transit',
      statusColor: colors.orange,
      statusBg: '#FFF3E0',
      courier: 'Delhivery',
      awb: 'AWB 112840923',
      lastUpdate: 'Bengaluru Hub · 4 hrs ago',
      expectedDelivery: 'Tomorrow, 30 May',
      timeline: [
        {label: 'Order confirmed at warehouse', time: '28 May · 10:00 AM', completed: true},
        {label: 'Packed & handed to courier', time: '29 May · 2:30 PM', completed: true},
        {label: 'In transit — Bengaluru Hub', time: '29 May · 6:15 PM · En route to delivery', completed: true, active: true},
        {label: 'Out for delivery', time: 'Estimated: 30 May, Morning', completed: false},
      ],
      progress: 75,
    },
    {
      id: 'ORD-2026-4803',
      product: 'Mixed SKU Bulk',
      units: '200+ units',
      amount: '₹1,18,000',
      status: 'Packing',
      statusColor: '#BA7517',
      statusBg: '#FFF8E1',
      courier: 'BlueDart',
      awb: 'AWB 998877665',
      lastUpdate: 'Warehouse · 2 hrs ago',
      expectedDelivery: '31 May, 2026',
      timeline: [
        {label: 'Order confirmed at warehouse', time: '27 May · 11:30 AM', completed: true},
        {label: 'Packing in progress', time: 'In progress', completed: true, active: true},
        {label: 'Ready for dispatch', time: 'Awaited', completed: false},
        {label: 'Out for delivery', time: 'Awaited', completed: false},
      ],
      progress: 40,
    },
    {
      id: 'ORD-2026-4790',
      product: 'Sesame Oil 500ml',
      units: '120 units',
      amount: '₹18,960',
      status: 'Delivered',
      statusColor: '#1D9E75',
      statusBg: '#E8F5F0',
      courier: 'DTDC',
      awb: 'AWB 556677889',
      lastUpdate: 'Delivered 25 May',
      expectedDelivery: 'Delivered on 25 May',
      timeline: [
        {label: 'Order confirmed at warehouse', time: '23 May · 9:00 AM', completed: true},
        {label: 'Packed & handed to courier', time: '23 May · 4:00 PM', completed: true},
        {label: 'In transit', time: '24 May · 8:00 AM', completed: true},
        {label: 'Delivered successfully', time: '25 May · 3:30 PM · Signed by Rajesh', completed: true, active: true},
      ],
      progress: 100,
    },
    {
      id: 'ORD-2026-4815',
      product: 'Groundnut Oil 5L',
      units: '80 units',
      amount: '₹68,400',
      status: 'Out for Delivery',
      statusColor: '#1976D2',
      statusBg: '#E3F2FD',
      courier: 'Ecom Express',
      awb: 'AWB 445566778',
      lastUpdate: 'Out for delivery · 1 hr ago',
      expectedDelivery: 'Today, by 6:00 PM',
      timeline: [
        {label: 'Order confirmed at warehouse', time: '28 May · 8:00 AM', completed: true},
        {label: 'Packed & handed to courier', time: '28 May · 12:00 PM', completed: true},
        {label: 'In transit', time: '29 May · 7:00 AM', completed: true},
        {label: 'Out for delivery', time: '30 May · 9:00 AM · Driver: Ramesh', completed: true, active: true},
      ],
      progress: 90,
    },
  ];

  let filteredShipments = activeFilter === 'All Orders'
    ? shipments
    : shipments.filter(s => {
        if (activeFilter === 'In Transit') return s.status === 'In Transit';
        if (activeFilter === 'Delivered') return s.status === 'Delivered';
        if (activeFilter === 'Pending') return s.status === 'Packing';
        return true;
      });

  if (searchQuery.trim()) {
    filteredShipments = filteredShipments.filter(s =>
      s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.courier.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  const stats = [
    {label: 'Total Orders', value: shipments.length, color: colors.text},
    {label: 'In Transit', value: shipments.filter(s => s.status === 'In Transit').length, color: colors.orange},
    {label: 'Out for Delivery', value: shipments.filter(s => s.status === 'Out for Delivery').length, color: '#1976D2'},
    {label: 'Delivered', value: shipments.filter(s => s.status === 'Delivered').length, color: '#1D9E75'},
  ];

  return (
    <View style={styles.container}>
      {/* Top Navigation Bar */}
      <View style={styles.topNav}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#FFFFFF" />
        </Pressable>
        <View style={styles.topNavCenter}>
          <Icon name="truck-delivery" size={24} color="#FFFFFF" />
          <Text style={styles.topNavTitle}>Dispatch & Tracking</Text>
        </View>
        <Pressable style={styles.searchBtn} onPress={() => setSearchVisible(!searchVisible)}>
          <Icon name="magnify" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Search Bar */}
      {searchVisible && (
        <View style={styles.searchBarContainer}>
          <Icon name="magnify" size={20} color={colors.muted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by Order ID, Product, or Courier..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={20} color={colors.muted} />
            </Pressable>
          )}
        </View>
      )}

      {/* Stats Cards — horizontal scroll below navbar */}
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          {stats.map(item => (
            <View key={item.label} style={styles.statCard}>
              <Text style={[styles.statCardValue, {color: item.color}]}>{item.value}</Text>
              <Text style={styles.statCardLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}>
          {filters.map(filter => (
            <Pressable
              key={filter}
              onPress={() => setActiveFilter(filter)}
              style={[
                styles.filterChip,
                activeFilter === filter && styles.filterChipActive,
              ]}>
              <Text
                style={[
                  styles.filterText,
                  activeFilter === filter && styles.filterTextActive,
                ]}>
                {filter}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}>
        {filteredShipments.map(shipment => (
          <ShipmentCard key={shipment.id} shipment={shipment} />
        ))}
      </ScrollView>
    </View>
  );
}

function ShipmentCard({shipment}) {
  const [expanded, setExpanded] = useState(false);

  const handleLiveMap = () => {
    Alert.alert(
      'Live Tracking',
      `Opening live map for ${shipment.id}`,
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Open Map', onPress: () => {
          console.log('Opening map for:', shipment.id);
        }},
      ]
    );
  };

  const handleCallDriver = () => {
    Alert.alert(
      'Call Driver',
      `Call driver for ${shipment.courier}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Call', onPress: () => {
          Linking.openURL('tel:+919876543210');
        }},
      ]
    );
  };

  return (
    <View style={styles.shipmentCard}>
      {/* Dark Header */}
      <View style={styles.darkHeader}>
        <View style={styles.headerTop}>
          <Text style={styles.orderId}>{shipment.id}</Text>
          <View style={[styles.statusBadge, {backgroundColor: shipment.statusBg}]}>
            <Text style={[styles.statusText, {color: shipment.statusColor}]}>
              {shipment.status}
            </Text>
          </View>
        </View>
        <Text style={styles.orderDetails}>
          {shipment.product} · {shipment.units} · {shipment.amount}
        </Text>

        {/* Progress Indicator */}
        <View style={styles.progressSection}>
          <View style={styles.progressSteps}>
            <View style={[styles.progressStep, styles.progressStepCompleted]}>
              <Icon name="check" size={16} color="#FFFFFF" />
            </View>
            <View style={[styles.progressLine, shipment.progress >= 50 && styles.progressLineActive]} />
            <View style={[styles.progressStep, shipment.progress >= 50 && styles.progressStepCompleted]}>
              <Icon name="check" size={16} color="#FFFFFF" />
            </View>
            <View style={[styles.progressLine, shipment.progress >= 75 && styles.progressLineActive]} />
            <View style={[styles.progressStep, shipment.progress >= 75 && styles.progressStepActive]}>
              <Icon name="truck-delivery" size={16} color="#FFFFFF" />
            </View>
            <View style={[styles.progressLine, shipment.progress === 100 && styles.progressLineActive]} />
            <View style={[styles.progressStep, shipment.progress === 100 && styles.progressStepCompleted]}>
              <Icon name="home" size={16} color="#FFFFFF" />
            </View>
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabel}>Confirmed</Text>
            <Text style={styles.progressLabel}>Packed</Text>
            <Text style={[styles.progressLabel, styles.progressLabelActive]}>Dispatched</Text>
            <Text style={styles.progressLabel}>Delivered</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, {width: `${shipment.progress}%`}]} />
        </View>

        <Text style={styles.expectedDelivery}>
          Expected delivery: <Text style={styles.expectedDate}>{shipment.expectedDelivery}</Text>
        </Text>
      </View>

      {/* Courier Info */}
      <View style={styles.courierSection}>
        <View style={styles.courierIcon}>
          <Icon name="truck-delivery" size={24} color={colors.red} />
        </View>
        <View style={styles.courierInfo}>
          <Text style={styles.courierName}>{shipment.courier} — {shipment.awb}</Text>
          <Text style={styles.courierUpdate}>Last update: {shipment.lastUpdate}</Text>
        </View>
        <Pressable style={styles.trackBtn}>
          <Icon name="map-marker" size={16} color={colors.red} />
          <Text style={styles.trackBtnText}>Track</Text>
        </Pressable>
      </View>

      {/* Delivery Timeline */}
      {expanded && (
        <View style={styles.timelineSection}>
          <Text style={styles.timelineTitle}>Delivery Timeline</Text>
          <View style={styles.timeline}>
            {shipment.timeline.map((step, index) => (
              <View key={index} style={styles.timelineStep}>
                <View
                  style={[
                    styles.timelineDot,
                    step.completed && styles.timelineDotCompleted,
                    step.active && styles.timelineDotActive,
                  ]}
                />
                {index < shipment.timeline.length - 1 && (
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

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Pressable style={styles.actionBtn} onPress={handleLiveMap}>
              <Icon name="map" size={20} color={colors.red} />
              <Text style={styles.actionBtnText}>Live Map</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={handleCallDriver}>
              <Icon name="phone" size={20} color={colors.red} />
              <Text style={styles.actionBtnText}>Call Driver</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Expand Button */}
      <Pressable
        onPress={() => setExpanded(!expanded)}
        style={styles.expandBtn}>
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topNavCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    justifyContent: 'center',
  },
  topNavLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topNavTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stats Cards
  statsContainer: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    ...shadow,
  },
  statCardValue: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 6,
  },
  statCardLabel: {
    fontSize: 10,
    color: colors.muted,
    fontWeight: '600',
    textAlign: 'center',
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
  filterText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  content: {
    padding: 20,
    paddingTop: 16,
  },
  shipmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    ...shadow,
  },
  darkHeader: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
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
  orderDetails: {
    color: colors.muted,
    fontSize: 14,
    marginBottom: 20,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressStep: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFCDD2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressStepCompleted: {
    backgroundColor: '#1D9E75',
  },
  progressStepActive: {
    backgroundColor: colors.red,
  },
  progressLine: {
    flex: 1,
    height: 3,
    backgroundColor: '#FFCDD2',
    marginHorizontal: 4,
  },
  progressLineActive: {
    backgroundColor: '#1D9E75',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
    width: 70,
    textAlign: 'center',
  },
  progressLabelActive: {
    color: colors.red,
    fontWeight: '900',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#FFCDD2',
    borderRadius: 3,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.red,
    borderRadius: 3,
  },
  expectedDelivery: {
    color: colors.muted,
    fontSize: 14,
  },
  expectedDate: {
    color: colors.text,
    fontWeight: '900',
  },
  courierSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF5F5',
  },
  courierIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(198, 40, 40, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  courierInfo: {
    flex: 1,
  },
  courierName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  courierUpdate: {
    color: colors.muted,
    fontSize: 12,
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(198, 40, 40, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  trackBtnText: {
    color: colors.red,
    fontSize: 13,
    fontWeight: '700',
  },
  timelineSection: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  timelineTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 16,
  },
  timeline: {
    paddingLeft: 8,
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
    backgroundColor: '#1D9E75',
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
    backgroundColor: '#1D9E75',
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 16,
  },
  timelineLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  timelineLabelActive: {
    color: colors.red,
    fontWeight: '900',
  },
  timelineTime: {
    color: colors.muted,
    fontSize: 13,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(198, 40, 40, 0.1)',
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionBtnText: {
    color: colors.red,
    fontSize: 14,
    fontWeight: '700',
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  expandBtnText: {
    color: colors.red,
    fontSize: 14,
    fontWeight: '700',
  },
  searchBarContainer: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    padding: 0,
  },
});

export default DispatchTrackingPage;