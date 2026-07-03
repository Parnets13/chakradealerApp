/**
 * OrderManagementSection.js
 * Dealer "My Orders" screen.
 *
 * API: GET /api/dealer/orders
 * Full URL: http://<IP>:5001/api/dealer/orders
 *
 * Returns orders placed by THIS dealer — both:
 *   • Orders placed via dealer app  (source: 'DealerApp')
 *   • Orders created by admin in ERP for this dealer (source: 'ERP')
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import apiService from './services/apiService';

// ─── Theme ────────────────────────────────────────────────────────────────────
const C = {
  red:        '#D0281A',
  bg:         '#F2F0EC',
  white:      '#FFFFFF',
  text:       '#1A1A1A',
  sub:        '#555555',
  muted:      '#888888',
  line:       '#E8E4DE',
  green:      '#1A7A3C',
  greenBg:    '#E4F5EC',
  amber:      '#B86A00',
  amberBg:    '#FEF3E2',
  blue:       '#1565C0',
  blueBg:     '#E3F0FF',
  teal:       '#1A7A6E',
  tealBg:     '#E4F5F3',
  purple:     '#6A1B9A',
  purpleBg:   '#F3E5F5',
  navy:       '#0277BD',
  navyBg:     '#E1F5FE',
  olive:      '#558B2F',
  oliveBg:    '#F1F8E9',
};

const shadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 4,
};

// ─── 16 status labels + colour map ────────────────────────────────────────────
const STATUS_MAP = {
  'Order Placed':       { color: C.blue,   bg: C.blueBg   },
  'Pending Approval':   { color: C.amber,  bg: C.amberBg  },
  'Approved':           { color: C.green,  bg: C.greenBg  },
  'Rejected':           { color: C.red,    bg: '#FFF5F5'  },
  'Picking Started':    { color: C.purple, bg: C.purpleBg },
  'Picking Completed':  { color: C.purple, bg: '#EDE7F6'  },
  'Sorting Started':    { color: C.teal,   bg: C.tealBg   },
  'Sorting Completed':  { color: C.teal,   bg: '#B2DFDB'  },
  'Packing Started':    { color: C.navy,   bg: C.navyBg   },
  'Packing Completed':  { color: C.navy,   bg: '#B3E5FC'  },
  'Invoice Generated':  { color: C.blue,   bg: '#E3F2FD'  },
  'Ready for Dispatch': { color: C.olive,  bg: C.oliveBg  },
  'Dispatched':         { color: '#827717',bg: '#F9FBE7'  },
  'In Transit':         { color: C.teal,   bg: C.tealBg   },
  'Delivered':          { color: C.green,  bg: C.greenBg  },
  'Cancelled':          { color: C.red,    bg: '#FFF5F5'  },
};

// Filter tabs
const FILTERS = ['All', 'Pending Approval', 'Approved', 'In Transit', 'Delivered', 'Cancelled'];

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return String(d); }
};

const fmtAmount = (order) => {
  if (order.amount && typeof order.amount === 'string') return order.amount;
  const v = order.value || order.totalAmount || 0;
  return `₹${Number(v).toLocaleString('en-IN')}`;
};

// Build items preview string from whichever array exists (lineItems = dealer app, items = ERP admin)
const getItemsInfo = (order) => {
  const list = Array.isArray(order.lineItems) && order.lineItems.length > 0
    ? order.lineItems
    : Array.isArray(order.items) && order.items.length > 0
    ? order.items
    : [];

  if (list.length === 0) return { preview: 'No items', count: 0 };

  const first = list[0];
  const name  = first.name || first.itemName || first.sku || 'Item';
  const preview = list.length === 1
    ? name
    : `${name}  +${list.length - 1} more`;

  return { preview, count: list.length, list };
};

// ─── OrderCard ────────────────────────────────────────────────────────────────
function OrderCard({ order }) {
  const st = STATUS_MAP[order.status] || { color: C.muted, bg: '#F2F2F2' };
  const { preview, list = [] } = getItemsInfo(order);
  const isERP = (order.source || '').toUpperCase() === 'ERP';

  return (
    <View style={styles.card}>

      {/* ── Header row ── */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.orderId}>{order.id || order.orderId || '—'}</Text>
          <Text style={styles.orderDate}>{fmtDate(order.createdAt || order.orderDate)}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
          <Text style={[styles.statusLabel, { color: st.color }]}>
            {order.status || 'Unknown'}
          </Text>
        </View>
      </View>

      {/* ── Divider ── */}
      <View style={styles.divider} />

      {/* ── Stats row ── */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statVal}>{fmtAmount(order)}</Text>
          <Text style={styles.statLbl}>Value</Text>
        </View>
        <View style={styles.statSep} />
        <View style={styles.stat}>
          <Text style={styles.statVal}>{order.totalItems || list.length || 0}</Text>
          <Text style={styles.statLbl}>Items</Text>
        </View>
        <View style={styles.statSep} />
        <View style={styles.stat}>
          <Text style={styles.statVal}>{order.totalQty || order.totalQuantity || 0}</Text>
          <Text style={styles.statLbl}>Qty</Text>
        </View>
        <View style={styles.statSep} />
        <View style={styles.stat}>
          <Text style={[
            styles.statVal,
            (order.priority === 'Urgent' || order.priority === 'High') && { color: C.red },
          ]}>
            {order.priority || 'Normal'}
          </Text>
          <Text style={styles.statLbl}>Priority</Text>
        </View>
      </View>

      {/* ── Items preview ── */}
      {list.length > 0 && (
        <View style={styles.itemsBox}>
          {list.slice(0, 3).map((item, i) => (
            <View key={i} style={styles.itemRow}>
              <Icon name="package-variant-closed" size={12} color={C.muted} />
              <Text style={styles.itemName} numberOfLines={1}>
                {item.name || item.itemName || item.sku || 'Item'}
              </Text>
              <Text style={styles.itemQty}>×{item.quantity || 0}</Text>
              {(item.unitPrice || 0) > 0 && (
                <Text style={styles.itemPrice}>
                  ₹{Number((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString('en-IN')}
                </Text>
              )}
            </View>
          ))}
          {list.length > 3 && (
            <Text style={styles.itemMore}>+{list.length - 3} more items</Text>
          )}
        </View>
      )}

      {/* ── Dispatch info (if dispatched) ── */}
      {order.dispatchInfo && order.dispatchInfo.transportName && (
        <View style={styles.dispatchBox}>
          <Icon name="truck-delivery-outline" size={13} color={C.teal} />
          <Text style={styles.dispatchText}>
            {order.dispatchInfo.transportName}
            {order.dispatchInfo.vehicleNumber ? `  ·  ${order.dispatchInfo.vehicleNumber}` : ''}
            {order.dispatchInfo.lrNumber ? `  ·  LR: ${order.dispatchInfo.lrNumber}` : ''}
          </Text>
        </View>
      )}

      {/* ── Footer ── */}
      <View style={styles.cardFooter}>
        <View style={styles.footerLeft}>
          {/* GST chip */}
          {(order.totalGst || 0) > 0 && (
            <View style={styles.chip}>
              <Icon name="percent" size={10} color={C.navy} />
              <Text style={[styles.chipText, { color: C.navy }]}>
                GST ₹{Number(order.totalGst).toLocaleString('en-IN')}
              </Text>
            </View>
          )}
          {/* Source chip */}
          <View style={styles.chip}>
            <Icon name={isERP ? 'desktop-classic' : 'cellphone'} size={10} color={C.muted} />
            <Text style={[styles.chipText, { color: C.muted }]}>
              {isERP ? 'ERP' : 'App'}
            </Text>
          </View>
        </View>
        <Pressable style={styles.viewBtn}>
          <Icon name="eye-outline" size={14} color={C.red} />
          <Text style={styles.viewBtnText}>View</Text>
        </Pressable>
      </View>

    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function OrderManagementSection({ onBack }) {
  const [orders,       setOrders]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [search,       setSearch]       = useState('');

  // ── Fetch from GET /api/dealer/orders ──────────────────────────────────────
  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Hits: http://<IP>:5001/api/dealer/orders
      // apiService.get prepends API_BASE_URL = http://<IP>:5001/api/dealer
      const res = await apiService.get('/orders', {
        // status filter: send only when not 'All'
        ...(activeFilter !== 'All' && { status: activeFilter }),
        // search term
        ...(search.trim() && { search: search.trim() }),
        limit: 100,
      });

      if (res && res.success) {
        setOrders(res.data || []);
      } else {
        Alert.alert('Error', res?.message || 'Failed to load orders');
      }
    } catch (err) {
      console.error('[OrderMgmt] fetch error:', err?.message);
      Alert.alert('Connection Error', err?.message || 'Could not reach server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter, search]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders(true);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>

      {/* ── Navbar ── */}
      <View style={styles.navbar}>
        <Pressable onPress={onBack} style={styles.navBack}>
          <Icon name="arrow-left" size={22} color={C.white} />
        </Pressable>
        <Text style={styles.navTitle}>My Orders</Text>
        <Pressable onPress={() => fetchOrders()} style={styles.navRefresh}>
          <Icon name="refresh" size={22} color={C.white} />
        </Pressable>
      </View>

      {/* ── Search bar ── */}
      <View style={styles.searchBox}>
        <Icon name="magnify" size={18} color={C.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by order ID…"
          placeholderTextColor={C.muted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          onSubmitEditing={() => fetchOrders()}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <Icon name="close-circle" size={17} color={C.muted} />
          </Pressable>
        )}
      </View>

      {/* ── Filter tabs ── */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}>
          {FILTERS.map(f => (
            <Pressable
              key={f}
              onPress={() => setActiveFilter(f)}
              style={[styles.filterPill, activeFilter === f && styles.filterPillActive]}>
              <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>
                {f}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.red} />
          <Text style={styles.loadingText}>Loading orders…</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[C.red]}
              tintColor={C.red}
            />
          }>

          {/* summary count */}
          <Text style={styles.countText}>
            {orders.length} order{orders.length !== 1 ? 's' : ''}
            {activeFilter !== 'All' ? ` · ${activeFilter}` : ''}
          </Text>

          {orders.length === 0 ? (
            <View style={styles.empty}>
              <Icon name="package-variant" size={64} color={C.muted} />
              <Text style={styles.emptyTitle}>No Orders Found</Text>
              <Text style={styles.emptyText}>
                {search
                  ? 'Try a different search term'
                  : activeFilter !== 'All'
                  ? `No "${activeFilter}" orders`
                  : 'No orders yet'}
              </Text>
            </View>
          ) : (
            orders.map(order => (
              <OrderCard
                key={order.mongodbId || order._id || order.id}
                order={order}
              />
            ))
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  // Navbar
  navbar: {
    height: 56,
    backgroundColor: C.red,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  navBack: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  navTitle: {
    flex: 1,
    color: C.white,
    fontSize: 20,
    fontWeight: '900',
  },
  navRefresh: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
  },

  // Search
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    margin: 12,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: C.line,
    ...shadow,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: C.text,
    fontWeight: '500',
  },

  // Filter
  filterBar: {
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  filterScroll: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.line,
    backgroundColor: C.white,
  },
  filterPillActive: {
    backgroundColor: C.red,
    borderColor: C.red,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.text,
  },
  filterTextActive: {
    color: C.white,
    fontWeight: '900',
  },

  // List
  list: { flex: 1 },
  listContent: { padding: 12, gap: 12 },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.muted,
    marginBottom: 4,
    marginLeft: 4,
  },

  // Center / loading
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: C.muted,
  },

  // Empty
  empty: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: C.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 13,
    color: C.muted,
    marginTop: 6,
    textAlign: 'center',
  },

  // ── Card ──
  card: {
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.line,
    padding: 16,
    ...shadow,
  },

  // Card header
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderLeft: { flex: 1, marginRight: 10 },
  orderId: {
    fontSize: 15,
    fontWeight: '900',
    color: C.text,
    letterSpacing: 0.2,
  },
  orderDate: {
    fontSize: 11,
    fontWeight: '600',
    color: C.muted,
    marginTop: 3,
  },
  statusPill: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexShrink: 0,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },

  divider: {
    height: 1,
    backgroundColor: C.line,
    marginBottom: 12,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stat: { flex: 1, alignItems: 'center' },
  statVal: {
    fontSize: 13,
    fontWeight: '900',
    color: C.text,
  },
  statLbl: {
    fontSize: 10,
    fontWeight: '600',
    color: C.muted,
    marginTop: 2,
  },
  statSep: {
    width: 1,
    height: 28,
    backgroundColor: C.line,
  },

  // Items preview
  itemsBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    marginBottom: 10,
    gap: 5,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: C.sub,
  },
  itemQty: {
    fontSize: 11,
    fontWeight: '700',
    color: C.muted,
  },
  itemPrice: {
    fontSize: 11,
    fontWeight: '700',
    color: C.red,
    marginLeft: 4,
  },
  itemMore: {
    fontSize: 11,
    fontWeight: '700',
    color: C.red,
    marginTop: 2,
  },

  // Dispatch info
  dispatchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.tealBg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  dispatchText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.teal,
    flex: 1,
  },

  // Footer
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 10,
  },
  footerLeft: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F3F5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF5F5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#FFE3E3',
  },
  viewBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: C.red,
  },
});
