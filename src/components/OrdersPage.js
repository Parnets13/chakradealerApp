/**
 * OrdersPage.js  –  SCREEN 6: My Orders
 * GET /api/dealer/orders
 * 16 exact status labels from Admin panel.
 * Tapping an order → TrackOrderPage.
 * Pull-to-refresh syncs live from backend.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, shadow } from './theme';
import orderService from './services/orderService';
import TrackOrderPage from './TrackOrderPage';

// ── 16 exact status labels from Admin panel ────────────────────────────────
export const ALL_STATUSES = [
  'All',
  'Order Placed',
  'Pending Approval',
  'Approved',
  'Rejected',
  'Picking Started',
  'Picking Completed',
  'Sorting Started',
  'Sorting Completed',
  'Packing Started',
  'Packing Completed',
  'Invoice Generated',
  'Ready for Dispatch',
  'Dispatched',
  'In Transit',
  'Delivered',
  'Cancelled',
];

export const STATUS_STYLE = {
  'Order Placed':        { color: '#1565C0', bg: '#E3F0FF' },
  'Pending Approval':    { color: '#E65100', bg: '#FFF3E0' },
  'Approved':            { color: '#2E7D32', bg: '#E8F5E9' },
  'Rejected':            { color: '#B71C1C', bg: '#FFEBEE' },
  'Picking Started':     { color: '#6A1B9A', bg: '#F3E5F5' },
  'Picking Completed':   { color: '#6A1B9A', bg: '#EDE7F6' },
  'Sorting Started':     { color: '#00695C', bg: '#E0F2F1' },
  'Sorting Completed':   { color: '#00695C', bg: '#B2DFDB' },
  'Packing Started':     { color: '#0277BD', bg: '#E1F5FE' },
  'Packing Completed':   { color: '#0277BD', bg: '#B3E5FC' },
  'Invoice Generated':   { color: '#1565C0', bg: '#E3F2FD' },
  'Ready for Dispatch':  { color: '#558B2F', bg: '#F1F8E9' },
  'Dispatched':          { color: '#827717', bg: '#F9FBE7' },
  'In Transit':          { color: '#2196F3', bg: 'rgba(33,150,243,0.1)' },
  'Delivered':           { color: '#2E7D32', bg: '#E8F5E9' },
  'Cancelled':           { color: '#B71C1C', bg: '#FFEBEE' },
};

const fmtDate = (d) => {
  if (!d) return 'N/A';
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return String(d); }
};

function OrdersPage({ onBack }) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery]   = useState('');
  const [orders, setOrders]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await orderService.getOrders({
        status: activeFilter === 'All' ? undefined : activeFilter,
        search: searchQuery || undefined,
        page: 1,
        limit: 50,
      });
      if (response && response.success) {
        setOrders(response.data || []);
      } else {
        Alert.alert('Error', response?.message || 'Failed to fetch orders');
      }
    } catch (error) {
      console.error('Fetch orders error:', error);
      Alert.alert('Error', 'Failed to load orders. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [activeFilter, searchQuery]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  // ── Show TrackOrderPage ──────────────────────────────────────────────────
  if (selectedOrder) {
    return (
      <TrackOrderPage
        order={selectedOrder}
        onBack={() => setSelectedOrder(null)}
      />
    );
  }

  return (
    <View style={styles.page}>
      {/* ── Navbar ── */}
      <View style={styles.navbar}>
        <View style={styles.navTopRow}>
          <Pressable onPress={onBack} style={styles.navBackBtn}>
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.navTitle}>My Orders</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Search */}
        <View style={styles.navSearchSection}>
          <View style={styles.navSearchBar}>
            <Icon name="magnify" size={20} color="rgba(255,255,255,0.7)" />
            <TextInput
              placeholder="Search by order ID..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.navSearchInput}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <Icon name="close-circle" size={18} color="rgba(255,255,255,0.7)" />
              </Pressable>
            )}
          </View>
        </View>

        {/* 16 status filter pills */}
        <View style={styles.navFilterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.navFilterRow}>
            {ALL_STATUSES.map((filter) => (
              <Pressable
                key={filter}
                onPress={() => setActiveFilter(filter)}
                style={[
                  styles.navFilterPill,
                  activeFilter === filter && styles.navFilterPillActive,
                ]}>
                <Text
                  style={[
                    styles.navFilterText,
                    activeFilter === filter && styles.navFilterTextActive,
                  ]}>
                  {filter}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* ── List ── */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.red} />
          <Text style={styles.loaderText}>Loading orders…</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.orderList}
          contentContainerStyle={styles.orderListContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.red]}
            />
          }>
          {orders.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="package-variant" size={64} color={colors.muted} />
              <Text style={styles.emptyTitle}>No Orders Found</Text>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? 'Try a different search term'
                  : activeFilter !== 'All'
                  ? `No "${activeFilter}" orders`
                  : 'Place an order to see it here'}
              </Text>
              {orders.length === 0 && !searchQuery && activeFilter === 'All' && (
                <Pressable style={styles.shopBtn} onPress={() => onBack && onBack()}>
                  <Text style={styles.shopBtnText}>Start Shopping</Text>
                </Pressable>
              )}
            </View>
          ) : (
            orders.map((order) => {
              const st = STATUS_STYLE[order.status] || { color: colors.muted, bg: '#F2F2F2' };
              // Backend returns: id (orderId), mongodbId, status, priority, amount, totalItems,
              // totalQty, value, subTotal, totalGst, source, lineItems, createdAt, statusHistory
              const itemsPreview = Array.isArray(order.lineItems) && order.lineItems.length > 0
                ? order.lineItems.slice(0, 2)
                : [];

              // Dealer name — backend returns 'customer' field (SalesOrder.customer = dealer name)
              const dealerName = order.dealerName || order.dealer?.name || order.customer || null;

              return (
                <View key={order.mongodbId || order.id} style={styles.orderCard}>

                  {/* ── Header: Order ID + Status badge ── */}
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <Text style={styles.cardOrderId}>{order.id || order.orderId || '—'}</Text>
                      <Text style={styles.cardDate}>
                        <Icon name="calendar-outline" size={10} color="#868E96" />
                        {'  '}{fmtDate(order.createdAt || order.orderDate)}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                      <Text style={[styles.statusText, { color: st.color }]}>
                        {order.status}
                      </Text>
                    </View>
                  </View>

                  {/* ── Dealer row (if available) ── */}
                  {dealerName ? (
                    <View style={styles.dealerRow}>
                      <Icon name="account-tie-outline" size={13} color="#6C757D" />
                      <Text style={styles.dealerText} numberOfLines={1}>{dealerName}</Text>
                    </View>
                  ) : null}

                  <View style={styles.cardDivider} />

                  {/* ── Stats grid: Total Value | Items | Priority ── */}
                  <View style={styles.cardStatsRow}>
                    <View style={styles.statBox}>
                      <Text style={styles.statBoxValue}>
                        {order.amount
                          ? order.amount
                          : `₹${Number(order.value || order.totalAmount || 0).toLocaleString('en-IN')}`}
                      </Text>
                      <Text style={styles.statBoxLabel}>Total Value</Text>
                    </View>
                    <View style={styles.statSep} />
                    <View style={styles.statBox}>
                      <Text style={styles.statBoxValue}>
                        {order.totalItems || (Array.isArray(order.lineItems) ? order.lineItems.length : 0)}
                      </Text>
                      <Text style={styles.statBoxLabel}>Products</Text>
                    </View>
                    <View style={styles.statSep} />
                    <View style={styles.statBox}>
                      <Text style={[
                        styles.statBoxValue,
                        (order.priority === 'Urgent' || order.priority === 'High') && { color: colors.red },
                      ]}>
                        {order.priority || 'Normal'}
                      </Text>
                      <Text style={styles.statBoxLabel}>Priority</Text>
                    </View>
                  </View>

                  {/* ── Products preview ── */}
                  {itemsPreview.length > 0 && (
                    <View style={styles.itemsPreviewBox}>
                      {itemsPreview.map((item, idx) => (
                        <View key={idx} style={styles.itemPreviewRow}>
                          <Icon name="package-variant-closed" size={12} color="#868E96" />
                          <Text style={styles.itemPreviewName} numberOfLines={1}>
                            {item.name || item.itemName || item.sku || 'Item'}
                          </Text>
                          <Text style={styles.itemPreviewQty}>×{item.quantity || 0}</Text>
                          {(item.unitPrice || 0) > 0 && (
                            <Text style={styles.itemPreviewPrice}>
                              ₹{Number((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString('en-IN')}
                            </Text>
                          )}
                        </View>
                      ))}
                      {Array.isArray(order.lineItems) && order.lineItems.length > 2 && (
                        <Text style={styles.itemsMoreText}>
                          +{order.lineItems.length - 2} more items
                        </Text>
                      )}
                    </View>
                  )}

                  {/* ── GST chip (DealerApp source chip removed) ── */}
                  {(order.totalGst > 0 || order.invoice) && (
                    <View style={styles.cardMetaRow}>
                      {order.totalGst > 0 && (
                        <View style={styles.gstChip}>
                          <Icon name="percent" size={11} color="#0277BD" />
                          <Text style={styles.gstChipText}>
                            GST ₹{Number(order.totalGst || 0).toLocaleString('en-IN')}
                          </Text>
                        </View>
                      )}
                      {order.invoice && (
                        <View style={styles.invoiceChip}>
                          <Icon name="file-document-outline" size={11} color="#1565C0" />
                          <Text style={styles.invoiceChipText}>{order.invoice}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* ── Track button ── */}
                  <Pressable
                    style={styles.cardAction}
                    onPress={() => setSelectedOrder(order)}>
                    <Icon name="map-marker-path" size={14} color={colors.red} />
                    <Text style={styles.actionText}>TRACK ORDER</Text>
                    <Icon name="chevron-right" size={16} color={colors.red} />
                  </Pressable>
                </View>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F0F2F5' },

  // Navbar
  navbar: {
    backgroundColor: colors.red,
    paddingTop: 45,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...shadow,
    zIndex: 10,
  },
  navTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  navBackBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  navSearchSection: { paddingHorizontal: 20, marginBottom: 16 },
  navSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 44,
  },
  navSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 10,
    fontWeight: '500',
  },
  navFilterSection: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 4,
  },
  navFilterRow: { paddingHorizontal: 20, paddingVertical: 16, gap: 8 },
  navFilterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F3F5',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  navFilterPillActive: { backgroundColor: colors.red, borderColor: colors.red },
  navFilterText: { fontSize: 11, fontWeight: '700', color: '#495057' },
  navFilterTextActive: { color: '#FFFFFF' },

  // List
  orderList: { flex: 1 },
  orderListContent: { padding: 16, paddingTop: 20 },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loaderText: { marginTop: 16, fontSize: 14, color: colors.muted },

  // ── Cards ──
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    ...shadow,
  },

  // Header row
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardHeaderLeft: { flex: 1, marginRight: 10 },
  cardOrderId: { fontSize: 15, fontWeight: '900', color: '#212529', letterSpacing: 0.3 },
  cardDate:    { fontSize: 11, fontWeight: '600', color: '#868E96', marginTop: 3 },

  // Status badge
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, flexShrink: 0 },
  statusText:  { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },

  // Dealer row
  dealerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  dealerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#495057',
    flex: 1,
  },

  cardDivider: { height: 1, backgroundColor: '#F1F3F5', marginBottom: 12, marginTop: 2 },

  // Stats row — Total Value | Products | Priority
  cardStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  statBox: { flex: 1, alignItems: 'center' },
  statSep: { width: 1, height: 30, backgroundColor: '#DEE2E6' },
  statBoxValue: { fontSize: 13, fontWeight: '900', color: '#212529', textAlign: 'center' },
  statBoxLabel: { fontSize: 9, fontWeight: '700', color: '#ADB5BD', letterSpacing: 0.8, marginTop: 3, textAlign: 'center' },

  // Products preview
  itemsPreviewBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  itemPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  itemPreviewName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
  },
  itemPreviewQty: {
    fontSize: 11,
    fontWeight: '700',
    color: '#868E96',
  },
  itemPreviewPrice: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.red,
    marginLeft: 2,
  },
  itemsMoreText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.red,
    marginTop: 2,
  },

  // GST / Invoice chips
  cardMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  gstChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E1F5FE',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  gstChipText: { fontSize: 10, fontWeight: '700', color: '#0277BD' },
  invoiceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E3F0FF',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  invoiceChipText: { fontSize: 10, fontWeight: '700', color: '#1565C0' },

  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FFE3E3',
    marginTop: 4,
  },
  actionText: { fontSize: 11, fontWeight: '800', color: colors.red, letterSpacing: 0.5 },

  // Empty
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: colors.text, marginTop: 16 },
  emptyText:  {
    fontSize: 14,
    color: colors.muted,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  shopBtn: {
    marginTop: 20,
    backgroundColor: colors.red,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  shopBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});

export default OrdersPage;
