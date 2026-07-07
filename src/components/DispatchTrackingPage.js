import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import dispatchService from './services/dispatchService';

const colors = {
  red: '#C51F2B',
  text: '#212121',
  muted: '#757575',
  orange: '#FF6F00',
  green: '#1D9E75',
  blue: '#1976D2',
};

const shadow = {
  shadowColor: '#000',
  shadowOpacity: 0.1,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 3,
};

// ── Status helpers ────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  'In Transit':  { color: colors.orange, bg: '#FFF3E0' },
  Preparing:     { color: '#BA7517',     bg: '#FFF8E1' },
  Pending:       { color: '#BA7517',     bg: '#FFF8E1' },
  Delivered:     { color: colors.green,  bg: '#E8F5F0' },
  Cancelled:     { color: colors.red,    bg: '#FFEBEE' },
};

const getStatusStyle = (status) =>
  STATUS_STYLE[status] || { color: colors.blue, bg: '#E3F2FD' };

const fmtDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return String(d); }
};

// ── DispatchTrackingPage ──────────────────────────────────────────────────────
function DispatchTrackingPage({ onBack, initialOrderId }) {
  const [activeFilter, setActiveFilter]   = useState('All Orders');
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery]     = useState('');
  const [shipments, setShipments]         = useState([]);
  const [stats, setStats]                 = useState({ total: 0, inTransit: 0, outForDelivery: 0, delivered: 0 });
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  // Track which order was opened from "My Orders"
  const [highlightedOrderId, setHighlightedOrderId] = useState(initialOrderId || null);

  // When initialOrderId changes (navigation from My Orders), update highlight
  useEffect(() => {
    if (initialOrderId) setHighlightedOrderId(initialOrderId);
  }, [initialOrderId]);

  const filters = ['All Orders', 'In Transit', 'Delivered', 'Pending', 'Preparing'];

  const fetchDispatches = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await dispatchService.getDispatches({
        status: activeFilter,
        ...(searchQuery.trim() && { search: searchQuery.trim() }),
        limit: 50,
      });
      if (res && res.success) {
        setShipments(res.data || []);
        if (res.stats) setStats(res.stats);
      } else {
        Alert.alert('Error', res?.message || 'Failed to load dispatches');
      }
    } catch (err) {
      console.error('[DispatchTracking] fetch error:', err?.message);
      Alert.alert('Connection Error', err?.message || 'Could not reach server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter, searchQuery]);

  useEffect(() => { fetchDispatches(); }, [fetchDispatches]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDispatches(true);
  };

  const statCards = [
    { label: 'Total Orders',    value: stats.total         || shipments.length, color: colors.text   },
    { label: 'In Transit',      value: stats.inTransit     || 0,                color: colors.orange },
    { label: 'Delivered',       value: stats.delivered     || 0,                color: colors.green  },
    { label: 'Preparing',       value: stats.preparing     || 0,                color: colors.blue   },
  ];

  return (
    <View style={styles.container}>
      {/* Top Nav */}
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
            onSubmitEditing={() => fetchDispatches()}
            returnKeyType="search"
            autoFocus
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={20} color={colors.muted} />
            </Pressable>
          )}
        </View>
      )}

      {/* "From My Orders" context banner */}
      {highlightedOrderId && (
        <View style={styles.contextBanner}>
          <Icon name="map-marker-path" size={16} color={colors.red} />
          <Text style={styles.contextBannerText}>
            Tracking order <Text style={styles.contextBannerOrder}>{highlightedOrderId}</Text> from My Orders
          </Text>
          <Pressable onPress={() => setHighlightedOrderId(null)}>
            <Icon name="close" size={16} color={colors.muted} />
          </Pressable>
        </View>
      )}

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          {statCards.map((item) => (
            <View key={item.label} style={styles.statCard}>
              <Text style={[styles.statCardValue, { color: item.color }]}>{item.value}</Text>
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
          {filters.map((filter) => (
            <Pressable
              key={filter}
              onPress={() => setActiveFilter(filter)}
              style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}>
              <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>
                {filter}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.red} />
          <Text style={styles.loadingText}>Loading dispatches…</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.red]} tintColor={colors.red} />
          }>
          {shipments.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="truck-outline" size={64} color={colors.muted} />
              <Text style={styles.emptyTitle}>No Dispatches Found</Text>
              <Text style={styles.emptyText}>
                {activeFilter !== 'All Orders'
                  ? `No "${activeFilter}" orders`
                  : 'No dispatch orders yet'}
              </Text>
            </View>
          ) : (
            shipments.map((shipment) => {
              const sid = shipment.mongodbId || shipment.orderId;
              const isHighlighted = highlightedOrderId &&
                (sid === highlightedOrderId || shipment.orderId === highlightedOrderId);
              return (
                <ShipmentCard
                  key={sid}
                  shipment={shipment}
                  autoExpand={isHighlighted}
                  highlighted={isHighlighted}
                />
              );
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

// ── ShipmentCard ──────────────────────────────────────────────────────────────
function ShipmentCard({ shipment, autoExpand, highlighted }) {
  const [expanded, setExpanded] = useState(autoExpand || false);
  const [trackDetail, setTrackDetail]   = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Auto-expand and fetch details when navigated from My Orders
  useEffect(() => {
    if (autoExpand && !trackDetail) {
      fetchTrackDetail();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoExpand]);

  const st = getStatusStyle(shipment.dispatchStatus || shipment.status);

  const fetchTrackDetail = async () => {
    if (trackDetail) return; // already loaded
    try {
      setLoadingDetail(true);
      const res = await dispatchService.trackDispatch(shipment.mongodbId || shipment.orderId);
      if (res && res.success) {
        setTrackDetail(res.data);
      }
    } catch (err) {
      console.error('[ShipmentCard] track error:', err?.message);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) fetchTrackDetail();
  };

  const handleCallDriver = () => {
    Alert.alert('Call Driver', `Call driver for ${shipment.courier || 'courier'}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Call', onPress: () => Linking.openURL('tel:+919876543210') },
    ]);
  };

  // Use stages from track detail if loaded, else build mini-timeline from status
  const stages = trackDetail?.stages || null;

  return (
    <View style={[
      styles.shipmentCard,
      highlighted && styles.shipmentCardHighlighted,
    ]}>
      {/* Header */}
      <View style={styles.darkHeader}>
        <View style={styles.headerTop}>
          <Text style={styles.orderId}>{shipment.orderId || '—'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
            <Text style={[styles.statusText, { color: st.color }]}>
              {shipment.dispatchStatus || shipment.status || 'Unknown'}
            </Text>
          </View>
        </View>

        <Text style={styles.orderDetails}>
          {shipment.productPreview}
          {shipment.totalUnits ? ` · ${shipment.totalUnits} units` : ''}
          {shipment.amount     ? ` · ${shipment.amount}`           : ''}
        </Text>

        {/* 4-step progress indicator */}
        <View style={styles.progressSection}>
          <View style={styles.progressSteps}>
            {/* Confirmed */}
            <View style={[styles.progressStep, styles.progressStepCompleted]}>
              <Icon name="check" size={14} color="#FFFFFF" />
            </View>
            <View style={[styles.progressLine, (shipment.progress || 0) >= 50 && styles.progressLineActive]} />
            {/* Packed */}
            <View style={[styles.progressStep, (shipment.progress || 0) >= 50 && styles.progressStepCompleted]}>
              <Icon name="check" size={14} color="#FFFFFF" />
            </View>
            <View style={[styles.progressLine, (shipment.progress || 0) >= 80 && styles.progressLineActive]} />
            {/* Dispatched */}
            <View style={[
              styles.progressStep,
              (shipment.progress || 0) >= 80 && (shipment.progress || 0) < 100
                ? styles.progressStepActive
                : (shipment.progress || 0) === 100
                ? styles.progressStepCompleted
                : null,
            ]}>
              <Icon name="truck-delivery" size={14} color="#FFFFFF" />
            </View>
            <View style={[styles.progressLine, (shipment.progress || 0) === 100 && styles.progressLineActive]} />
            {/* Delivered */}
            <View style={[styles.progressStep, (shipment.progress || 0) === 100 && styles.progressStepCompleted]}>
              <Icon name="home" size={14} color="#FFFFFF" />
            </View>
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabel}>Confirmed</Text>
            <Text style={styles.progressLabel}>Packed</Text>
            <Text style={[
              styles.progressLabel,
              (shipment.progress || 0) >= 80 && styles.progressLabelActive,
            ]}>Dispatched</Text>
            <Text style={styles.progressLabel}>Delivered</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${shipment.progress || 0}%` }]} />
        </View>

        <Text style={styles.expectedDelivery}>
          Order date:{' '}
          <Text style={styles.expectedDate}>{fmtDate(shipment.orderDate)}</Text>
          {shipment.expectedDelivery ? (
            <>
              {'  ·  Expected: '}
              <Text style={styles.expectedDate}>{fmtDate(shipment.expectedDelivery)}</Text>
            </>
          ) : null}
        </Text>
      </View>

      {/* Courier info (only if courier assigned) */}
      {shipment.courier ? (
        <View style={styles.courierSection}>
          <View style={styles.courierIcon}>
            <Icon name="truck-delivery" size={24} color={colors.red} />
          </View>
          <View style={styles.courierInfo}>
            <Text style={styles.courierName}>
              {shipment.courier}
              {shipment.awbLrNumber ? `  ·  LR: ${shipment.awbLrNumber}` : ''}
            </Text>
            {shipment.vehicleNumber ? (
              <Text style={styles.courierUpdate}>Vehicle: {shipment.vehicleNumber}</Text>
            ) : (
              <Text style={styles.courierUpdate}>
                {shipment.dispatchDate ? `Dispatched: ${fmtDate(shipment.dispatchDate)}` : 'Dispatch info pending'}
              </Text>
            )}
          </View>
          <View style={styles.trackBadge}>
            <Icon name="map-marker-check" size={14} color={colors.red} />
            <Text style={styles.trackBtnText}>Active</Text>
          </View>
        </View>
      ) : (
        <View style={styles.courierSection}>
          <View style={styles.courierIcon}>
            <Icon name="clock-outline" size={24} color={colors.muted} />
          </View>
          <View style={styles.courierInfo}>
            <Text style={styles.courierName}>Logistics not yet assigned</Text>
            <Text style={styles.courierUpdate}>
              Status: {shipment.status || 'Pending'}
            </Text>
          </View>
        </View>
      )}

      {/* Expanded: Full stage timeline */}
      {expanded && (
        <View style={styles.timelineSection}>
          <Text style={styles.timelineTitle}>Order Timeline</Text>

          {loadingDetail ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.red} />
            </View>
          ) : stages && stages.length > 0 ? (
            <View style={styles.timeline}>
              {stages.map((step, index) => (
                <View key={index} style={styles.timelineStep}>
                  <View
                    style={[
                      styles.timelineDot,
                      step.completed && styles.timelineDotCompleted,
                      step.active    && styles.timelineDotActive,
                    ]}
                  />
                  {index < stages.length - 1 && (
                    <View
                      style={[
                        styles.timelineLine,
                        step.completed && styles.timelineLineCompleted,
                      ]}
                    />
                  )}
                  <View style={styles.timelineContent}>
                    <Text style={[
                      styles.timelineLabel,
                      step.active && styles.timelineLabelActive,
                      step.pending && styles.timelineLabelPending,
                    ]}>
                      {step.stage}
                    </Text>
                    {step.at ? (
                      <Text style={styles.timelineTime}>{fmtDate(step.at)}{step.note ? `  ·  ${step.note}` : ''}</Text>
                    ) : step.pending ? (
                      <Text style={styles.timelineTime}>Awaited</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ color: colors.muted, fontSize: 13, paddingLeft: 8 }}>
              No timeline data available
            </Text>
          )}

          {/* Items in this order */}
          {trackDetail?.items && trackDetail.items.length > 0 && (
            <View style={styles.itemsSection}>
              <Text style={styles.itemsTitle}>Items in this Order</Text>
              {trackDetail.items.map((item, i) => (
                <View key={i} style={styles.itemRow}>
                  <Icon name="package-variant-closed" size={12} color={colors.muted} />
                  <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.itemQty}>×{item.quantity}</Text>
                  {item.unitPrice > 0 && (
                    <Text style={styles.itemPrice}>
                      ₹{Number(item.total || item.quantity * item.unitPrice).toLocaleString('en-IN')}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Pressable style={styles.actionBtn} onPress={handleCallDriver}>
              <Icon name="phone" size={20} color={colors.red} />
              <Text style={styles.actionBtnText}>Call Driver</Text>
            </Pressable>
            {shipment.awbLrNumber ? (
              <View style={[styles.actionBtn, { backgroundColor: '#E8F5F0' }]}>
                <Icon name="barcode" size={20} color={colors.green} />
                <Text style={[styles.actionBtnText, { color: colors.green }]}>
                  LR: {shipment.awbLrNumber}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      )}

      {/* Expand Button */}
      <Pressable onPress={handleExpand} style={styles.expandBtn}>
        <Text style={styles.expandBtnText}>{expanded ? 'Show Less' : 'View Details'}</Text>
        <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.red} />
      </Pressable>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },

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
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  topNavCenter: {
    flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, justifyContent: 'center',
  },
  topNavTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  searchBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  searchBarContainer: {
    backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#E0E0E0',
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, padding: 0 },

  statsContainer: { backgroundColor: '#F5F5F5', paddingVertical: 16, paddingHorizontal: 16 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12,
    paddingVertical: 16, paddingHorizontal: 8, alignItems: 'center', ...shadow,
  },
  statCardValue: { fontSize: 26, fontWeight: '900', marginBottom: 6 },
  statCardLabel: { fontSize: 10, color: colors.muted, fontWeight: '600', textAlign: 'center' },

  filterSection: {
    backgroundColor: '#FFFFFF', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#E0E0E0',
  },
  filterRow: { paddingHorizontal: 20, gap: 8 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20,
    backgroundColor: '#F5F5F5', marginRight: 8,
  },
  filterChipActive: { backgroundColor: colors.red },
  filterText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  filterTextActive: { color: '#FFFFFF' },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  loadingText: { marginTop: 12, color: colors.muted, fontSize: 14 },

  content: { padding: 16, paddingTop: 12 },

  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: colors.text, marginTop: 16 },
  emptyText: { fontSize: 13, color: colors.muted, marginTop: 6, textAlign: 'center' },

  shipmentCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, marginBottom: 16,
    overflow: 'hidden', ...shadow,
  },
  shipmentCardHighlighted: {
    borderWidth: 2,
    borderColor: colors.red,
  },
  contextBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF5F5', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#FFE3E3',
  },
  contextBannerText: { flex: 1, fontSize: 13, color: colors.text, fontWeight: '600' },
  contextBannerOrder: { color: colors.red, fontWeight: '900' },
  darkHeader: {
    backgroundColor: '#FFFFFF', padding: 20,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 6,
  },
  orderId: { color: colors.text, fontSize: 18, fontWeight: '900' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '800' },
  orderDetails: { color: colors.muted, fontSize: 13, marginBottom: 16 },

  progressSection: { marginBottom: 12 },
  progressSteps: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  progressStep: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#FFCDD2', alignItems: 'center', justifyContent: 'center',
  },
  progressStepCompleted: { backgroundColor: colors.green },
  progressStepActive:    { backgroundColor: colors.red },
  progressLine: { flex: 1, height: 3, backgroundColor: '#FFCDD2', marginHorizontal: 4 },
  progressLineActive: { backgroundColor: colors.green },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: {
    color: colors.muted, fontSize: 10, fontWeight: '600',
    width: 64, textAlign: 'center',
  },
  progressLabelActive: { color: colors.red, fontWeight: '900' },

  progressBarTrack: {
    height: 6, backgroundColor: '#FFCDD2', borderRadius: 3,
    marginBottom: 12, overflow: 'hidden',
  },
  progressBarFill: { height: '100%', backgroundColor: colors.red, borderRadius: 3 },

  expectedDelivery: { color: colors.muted, fontSize: 13 },
  expectedDate: { color: colors.text, fontWeight: '900' },

  courierSection: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, backgroundColor: '#FFF5F5',
  },
  courierIcon: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: 'rgba(198,40,40,0.1)',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  courierInfo: { flex: 1 },
  courierName: { color: colors.text, fontSize: 13, fontWeight: '800', marginBottom: 3 },
  courierUpdate: { color: colors.muted, fontSize: 12 },
  trackBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(198,40,40,0.1)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  trackBtnText: { color: colors.red, fontSize: 12, fontWeight: '700' },

  timelineSection: { padding: 20, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  timelineTitle: { color: colors.text, fontSize: 16, fontWeight: '900', marginBottom: 14 },
  timeline: { paddingLeft: 8 },
  timelineStep: { flexDirection: 'row', position: 'relative', marginBottom: 4 },
  timelineDot: {
    width: 14, height: 14, borderRadius: 7, backgroundColor: '#E0E0E0',
    marginRight: 14, marginTop: 3, zIndex: 2,
  },
  timelineDotCompleted: { backgroundColor: colors.green },
  timelineDotActive:    { backgroundColor: colors.red },
  timelineLine: {
    position: 'absolute', left: 6, top: 17, width: 2, height: 30, backgroundColor: '#E0E0E0',
  },
  timelineLineCompleted: { backgroundColor: colors.green },
  timelineContent: { flex: 1, paddingBottom: 14 },
  timelineLabel:       { color: colors.text, fontSize: 13, fontWeight: '600', marginBottom: 3 },
  timelineLabelActive: { color: colors.red, fontWeight: '900' },
  timelineLabelPending:{ color: '#BDBDBD' },
  timelineTime:        { color: colors.muted, fontSize: 12 },

  itemsSection: {
    marginTop: 16, backgroundColor: '#F8F9FA',
    borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#EEEEEE',
  },
  itemsTitle: { color: colors.text, fontSize: 13, fontWeight: '800', marginBottom: 8 },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5,
  },
  itemName: { flex: 1, fontSize: 12, fontWeight: '600', color: '#555' },
  itemQty:  { fontSize: 11, fontWeight: '700', color: colors.muted },
  itemPrice:{ fontSize: 11, fontWeight: '700', color: colors.red, marginLeft: 4 },

  actionButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: 'rgba(198,40,40,0.1)',
    paddingVertical: 12, borderRadius: 12,
  },
  actionBtnText: { color: colors.red, fontSize: 13, fontWeight: '700' },

  expandBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: '#F0F0F0',
  },
  expandBtnText: { color: colors.red, fontSize: 14, fontWeight: '700' },
});

export default DispatchTrackingPage;
