/**
 * OrderHistoryPage.js
 * Dealer ka simple order history — sirf cards, koi extra features nahi.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

let apiService;
try { apiService = require('./services/apiService').default; } catch (_) { apiService = null; }

// ─── Colors ───────────────────────────────────────────────────────────────────
const C = {
  primary:  '#C8102E',
  bg:       '#F5F7FA',
  card:     '#FFFFFF',
  border:   '#E2E8F0',
  text:     '#1A2332',
  sub:      '#4A5568',
  muted:    '#718096',
  green:    '#2E7D32',  greenBg:  '#E8F5E9',
  amber:    '#E65100',  amberBg:  '#FFF3E0',
  blue:     '#1565C0',  blueBg:   '#E3F0FF',
  purple:   '#6A1B9A',  purpleBg: '#F3E5F5',
  teal:     '#00695C',  tealBg:   '#E0F2F1',
  red:      '#B71C1C',  redBg:    '#FFEBEE',
};

// ─── Status badge config ──────────────────────────────────────────────────────
const ST = {
  'Order Placed':       { c: C.blue,    bg: C.blueBg   },
  'Pending Approval':   { c: C.amber,   bg: C.amberBg  },
  'Approved':           { c: C.green,   bg: C.greenBg  },
  'Rejected':           { c: C.red,     bg: C.redBg    },
  'Picking Started':    { c: C.purple,  bg: C.purpleBg },
  'Picking Completed':  { c: C.purple,  bg: '#EDE7F6'  },
  'Sorting Started':    { c: C.teal,    bg: C.tealBg   },
  'Sorting Completed':  { c: C.teal,    bg: '#B2DFDB'  },
  'Packing Started':    { c: '#0277BD', bg: '#E1F5FE'  },
  'Packing Completed':  { c: '#0277BD', bg: '#B3E5FC'  },
  'Invoice Generated':  { c: C.blue,    bg: '#E3F2FD'  },
  'Ready for Dispatch': { c: C.amber,   bg: '#FFF9C4'  },
  'Dispatched':         { c: '#827717', bg: '#F9FBE7'  },
  'In Transit':         { c: C.teal,    bg: C.tealBg   },
  'Delivered':          { c: C.green,   bg: C.greenBg  },
  'Cancelled':          { c: C.red,     bg: C.redBg    },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = d => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return String(d); }
};

const fmtAmt = v =>
  v != null && v !== 0 ? `₹${Number(v).toLocaleString('en-IN')}` : '—';

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OrderHistoryPage({ onBack }) {
  const [orders, setOrders]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      if (!apiService) throw new Error('API service unavailable');
      const res = await apiService.get('/orders', { limit: 200, sort: '-createdAt' });
      setOrders(res?.data || res?.orders || []);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to load order history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  if (loading) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <Header onBack={onBack} />
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={s.loadingTxt}>Loading order history…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <Header onBack={onBack} />
      <FlatList
        data={orders}
        keyExtractor={item =>
          String(item._id || item.mongodbId || item.orderId || item.id || Math.random())
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchOrders(true)}
            colors={[C.primary]}
            tintColor={C.primary}
          />
        }
        renderItem={({ item, index }) => (
          <OrderCard order={item} index={index} />
        )}
        ListEmptyComponent={
          <View style={s.emptyBox}>
            <Icon name="history" size={56} color="#D0D0D0" />
            <Text style={s.emptyTitle}>No orders yet</Text>
            <Text style={s.emptySubtitle}>Your order history will appear here</Text>
          </View>
        }
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function Header({ onBack }) {
  return (
    <View style={s.header}>
      <Pressable onPress={onBack} style={s.backBtn} hitSlop={8}>
        <Icon name="arrow-left" size={22} color="#FFF" />
      </Pressable>
      <Text style={s.headerTitle}>Order History</Text>
      <View style={s.headerIconBox}>
        <Icon name="history" size={20} color="#FFF" />
      </View>
    </View>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────
function OrderCard({ order, index }) {
  const orderId   = order.orderId || order.id || order._id || `#${index + 1}`;
  const status    = order.status  || 'Unknown';
  const cfg       = ST[status]    || { c: C.muted, bg: '#F0F0F0' };
  const amount    = order.totalAmount || order.value || order.totalValue || 0;
  const orderDate = order.orderDate   || order.createdAt;
  const product   =
    order.productName ||
    order.product?.name ||
    order.lineItems?.[0]?.name ||
    order.items?.[0]?.name ||
    '—';
  const qty =
    order.quantity ||
    order.lineItems?.[0]?.quantity ||
    order.items?.[0]?.quantity ||
    null;

  return (
    <View style={s.card}>
      {/* Left color strip */}
      <View style={[s.strip, { backgroundColor: cfg.c }]} />

      <View style={s.cardBody}>
        {/* Top row: Order ID + Status badge */}
        <View style={s.topRow}>
          <Text style={s.orderId}>{orderId}</Text>
          <View style={[s.badge, { backgroundColor: cfg.bg }]}>
            <Text style={[s.badgeTxt, { color: cfg.c }]}>{status}</Text>
          </View>
        </View>

        {/* Product name */}
        <Text style={s.product} numberOfLines={1}>{product}</Text>

        {/* Bottom row: date, qty, amount */}
        <View style={s.bottomRow}>
          <View style={s.metaItem}>
            <Icon name="calendar-outline" size={12} color={C.muted} />
            <Text style={s.metaTxt}>{fmtDate(orderDate)}</Text>
          </View>
          {qty != null && (
            <View style={s.metaItem}>
              <Icon name="package-variant-closed" size={12} color={C.muted} />
              <Text style={s.metaTxt}>Qty: {qty}</Text>
            </View>
          )}
          <Text style={s.amount}>{fmtAmt(amount)}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Screen — background light grey, NOT red
  screen: { flex: 1, backgroundColor: C.bg },

  // Header only is red
  header: {
    backgroundColor: C.primary,
    flexDirection:   'row',
    alignItems:      'center',
    paddingHorizontal: 16,
    paddingTop:      14,
    paddingBottom:   16,
    gap:             12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, color: '#FFF', fontSize: 18, fontWeight: '900' },
  headerIconBox: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  // List
  listContent: { paddingTop: 12, paddingHorizontal: 14, paddingBottom: 100 },

  // Card — white background
  card: {
    backgroundColor: C.card,
    borderRadius:    14,
    marginBottom:    10,
    flexDirection:   'row',
    overflow:        'hidden',
    borderWidth:     1,
    borderColor:     C.border,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.06,
    shadowRadius:    4,
    elevation:       2,
  },
  strip:    { width: 5 },
  cardBody: { flex: 1, padding: 14 },

  topRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  orderId:  { fontSize: 14, fontWeight: '800', color: C.text },

  badge:    { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeTxt: { fontSize: 11, fontWeight: '700' },

  product:  { fontSize: 13, color: C.sub, marginBottom: 10 },

  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metaItem:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTxt:   { fontSize: 11, color: C.muted },
  amount:    { marginLeft: 'auto', fontSize: 14, fontWeight: '800', color: C.text },

  // Loading / empty
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingTxt:   { marginTop: 12, color: C.muted, fontSize: 14 },
  emptyBox:     { alignItems: 'center', paddingTop: 80 },
  emptyTitle:   { fontSize: 16, fontWeight: '800', color: C.text, marginTop: 16 },
  emptySubtitle:{ fontSize: 13, color: C.muted, marginTop: 6 },
});
