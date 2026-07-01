import React, {useState, useEffect} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import orderService from './services/orderService';

// ─── Theme ───────────────────────────────────────────────────────────────────
const colors = {
  red: '#D0281A',
  bg: '#F2F0EC',
  text: '#1A1A1A',
  muted: '#888888',
  line: '#E8E4DE',
  green: '#1A7A3C',
  greenLight: '#E4F5EC',
  amber: '#B86A00',
  amberLight: '#FEF3E2',
  teal: '#1A7A6E',
  tealLight: '#E4F5F3',
};

const shadow = {
  shadowColor: '#000',
  shadowOffset: {width: 0, height: 2},
  shadowOpacity: 0.07,
  shadowRadius: 6,
  elevation: 3,
};

// ─── Filter Tabs ───────────────────────────────────────────────────────────────
const FILTERS = ['All', 'Pending', 'In Transit', 'Delivered'];

// ─── Helper function to get status style ───────────────────────────────────────
const getStatusStyle = (status) => {
  switch (status) {
    case 'Pending':
    case 'Pending Approval':
    case 'Processing':
      return {
        color: colors.amber,
        bg: colors.amberLight,
      };
    case 'Shipped':
    case 'In Transit':
    case 'Dispatched':
      return {
        color: colors.teal,
        bg: colors.tealLight,
      };
    case 'Delivered':
      return {
        color: colors.green,
        bg: colors.greenLight,
      };
    case 'Cancelled':
    case 'Rejected':
      return {
        color: colors.red,
        bg: '#FFF5F5',
      };
    default:
      return {
        color: colors.muted,
        bg: '#F1F3F5',
      };
  }
};

// ─── Helper function to map status to filter ───────────────────────────────────
const mapStatusToFilter = (status) => {
  if (['Shipped', 'In Transit', 'Dispatched'].includes(status)) {
    return 'In Transit';
  }
  if (['Pending', 'Pending Approval', 'Processing', 'Approved', 'Picking Started', 'Picking Completed', 'Sorting Started', 'Sorting Completed', 'Packing Started', 'Packing Completed', 'Invoice Generated', 'Ready for Dispatch'].includes(status)) {
    return 'Pending';
  }
  if (status === 'Delivered') {
    return 'Delivered';
  }
  return 'All';
};

// ─── Order Card ───────────────────────────────────────────────────────────────
function OrderCard({ order }) {
  const statusStyle = getStatusStyle(order.status);
  const formattedDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : 'N/A';
  
  // Get description from line items
  let desc = 'No items';
  if (Array.isArray(order.lineItems) && order.lineItems.length > 0) {
    const firstItem = order.lineItems[0];
    desc = firstItem.name || firstItem.sku || 'Item';
    if (order.lineItems.length > 1) {
      desc += ` +${order.lineItems.length - 1} more`;
    }
  } else if (Array.isArray(order.items) && order.items.length > 0) {
    const firstItem = order.items[0];
    desc = firstItem.itemName || firstItem.sku || 'Item';
    if (order.items.length > 1) {
      desc += ` +${order.items.length - 1} more`;
    }
  }

  return (
    <View style={styles.card}>
      {/* Top row: order ID + status pill */}
      <View style={styles.cardTop}>
        <View style={styles.cardTopLeft}>
          <Text style={styles.orderId}>{order.id || order.orderId}</Text>
          <Text style={styles.orderDesc}>{desc}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.statusText, { color: statusStyle.color }]}>
            {order.status}
          </Text>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{order.amount || `₹${Number(order.value || 0).toLocaleString('en-IN')}`}</Text>
          <Text style={styles.statLabel}>Order value</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{order.totalQty || order.totalQuantity || order.totalItems || '0'}</Text>
          <Text style={styles.statLabel}>Units</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formattedDate}</Text>
          <Text style={styles.statLabel}>Placed on</Text>
        </View>
      </View>

      {/* Bottom row: placed time + action */}
      <View style={styles.cardBottom}>
        <Text style={styles.placedText}>Priority: {order.priority || 'Normal'}</Text>
        <Pressable style={styles.actionRow}>
          <Icon name="eye-outline" size={15} color={colors.red} />
          <Text style={styles.actionText}>View</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
function OrderManagementSection({onBack}) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await orderService.getOrders({
        status: activeFilter !== 'All' ? activeFilter : undefined,
      });
      if (response.success) {
        setOrders(response.data || []);
      } else {
        Alert.alert('Error', response.message || 'Failed to load orders');
      }
    } catch (error) {
      console.error('Fetch orders error:', error);
      Alert.alert('Error', 'Failed to load orders. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [activeFilter]);

  const filteredOrders = activeFilter === 'All' 
    ? orders 
    : orders.filter(order => mapStatusToFilter(order.status) === activeFilter);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn}>
            <Icon name="arrow-left" size={22} color="#FFFFFF" />
          </Pressable>
        <Text style={styles.headerTitle}>My Orders</Text>
        <Pressable style={styles.searchBtn} onPress={fetchOrders}>
            <Icon name="refresh" size={22} color="#FFFFFF" />
          </Pressable>
      </View>

      {/* ── Filter Tabs ── */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}>
          {FILTERS.map(f => (
            <Pressable
              key={f}
              onPress={() => setActiveFilter(f)}
              style={[
                styles.filterTab,
                activeFilter === f && styles.filterTabActive,
              ]}>
              <Text
                style={[
                  styles.filterText,
                  activeFilter === f && styles.filterTextActive,
                ]}>
                {f}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* ── Orders List ── */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.red} />
          <Text style={styles.loaderText}>Loading orders...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollBody}>
          {filteredOrders.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="package-variant-closed" size={64} color={colors.muted} />
              <Text style={styles.emptyText}>No orders in this category</Text>
            </View>
          ) : (
            filteredOrders.map(order => (
              <OrderCard key={order.mongodbId || order.id || order._id} order={order} />
            ))
          )}
          <View style={{height: 30}} />
        </ScrollView>
      )}

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // ── Header ──
  header: {
    height: 56,
    backgroundColor: colors.red,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  searchBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Filter Tabs ──
  filterWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  filterTab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: '#FFFFFF',
  },
  filterTabActive: {
    backgroundColor: colors.red,
    borderColor: colors.red,
  },
  filterText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  // ── Scroll ──
  scroll: {
    flex: 1,
  },
  scrollBody: {
    padding: 14,
    gap: 12,
  },

  // ── Order Card ──
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    ...shadow,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  cardTopLeft: {
    flex: 1,
    paddingRight: 10,
  },
  orderId: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  orderDesc: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 3,
  },
  statusPill: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
  },

  // ── Stats Row ──
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  statItem: {
    flex: 1,
  },
  statValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  statLabel: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.line,
    marginHorizontal: 10,
  },

  // ── Card Bottom ──
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 12,
  },
  placedText: {
    color: colors.muted,
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionText: {
    color: colors.red,
    fontSize: 13,
    fontWeight: '800',
  },

  // ── Empty State ──
  emptyState: {
    alignItems: 'center',
    marginTop: 80,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '700',
  },

  // ── Loader ──
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loaderText: {
    marginTop: 16,
    fontSize: 14,
    color: colors.muted,
  },
});

export default OrderManagementSection;
