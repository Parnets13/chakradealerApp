/**
 * PlaceOrderPage.js
 * ─────────────────────────────────────────────────────────────
 * Dealer App — "Place Order" screen.
 *
 * • Navbar: react-native-vector-icons arrow-left + cart-outline
 * • "Available Place Order (N)" heading — no white bg
 * • "Order Placed" orders fetched from GET /orders?status=Order Placed
 *   and shown as full cards (same data OrderManagementSection uses)
 * ─────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import apiService       from './services/apiService';
import { API_ENDPOINTS } from './config/api';

// ─── Theme ────────────────────────────────────────────────────────────────────
const C = {
  red:    '#C51F2B',
  bg:     '#F2F0EC',
  white:  '#FFFFFF',
  text:   '#1A1A1A',
  sub:    '#555555',
  muted:  '#888888',
  line:   '#E8E4DE',
  green:  '#1A7A3C',  greenBg: '#E4F5EC',
  blue:   '#1565C0',  blueBg:  '#E3F0FF',
  amber:  '#B86A00',  amberBg: '#FEF3E2',
};

const shadow = {
  shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
};

const CURRENCY = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const fmtDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return String(d); }
};

// ─── "Order Placed" status card (same data shape as OrderManagementSection) ──
function PlacedOrderCard({ order }) {
  const items =
    Array.isArray(order.lineItems) && order.lineItems.length > 0 ? order.lineItems
    : Array.isArray(order.items)   && order.items.length   > 0   ? order.items
    : [];

  const firstName     = items[0]?.name || items[0]?.itemName || '—';
  const firstCategory = items[0]?.category || '—';
  const itemCount     = items.length;
  const total         = order.value || order.totalAmount || 0;
  const orderId       = order.orderId || order.id || '—';

  return (
    <View style={s.orderCard}>
      {/* top row: orderId + status pill */}
      <View style={s.orderTopRow}>
        <View style={s.orderIdRow}>
          <Icon name="receipt" size={13} color={C.muted} />
          <Text style={s.orderId}>{orderId}</Text>
        </View>
        <View style={s.statusPill}>
          <Text style={s.statusText}>ORDER PLACED</Text>
        </View>
      </View>

      {/* date + source */}
      <View style={s.orderMeta}>
        <Icon name="calendar-outline" size={11} color={C.muted} />
        <Text style={s.orderMetaText}>
          {fmtDate(order.createdAt || order.orderDate)}
        </Text>
        <View style={s.sourceChip}>
          <Icon name="cellphone" size={9} color={C.muted} />
          <Text style={s.sourceText}>App</Text>
        </View>
      </View>

      <View style={s.orderDivider} />

      {/* product info row */}
      <View style={s.productRow}>
        <View style={s.productIcon}>
          <Icon name="package-variant" size={18} color={C.red} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.productName} numberOfLines={1}>{firstName}</Text>
          <Text style={s.productCategory}>Category: {firstCategory}</Text>
          <Text style={s.productCount}>
            {itemCount > 0 ? `${itemCount} item${itemCount !== 1 ? 's' : ''}` : 'No items'}
          </Text>
        </View>
        <View style={s.valueBox}>
          <Text style={s.valueAmount}>{CURRENCY(total)}</Text>
          <Text style={s.valueLabel}>Total</Text>
        </View>
      </View>

      {/* GST row */}
      {(order.totalGst || 0) > 0 && (
        <View style={s.gstRow}>
          <Icon name="percent" size={10} color={C.blue} />
          <Text style={s.gstText}>
            GST ₹{Number(order.totalGst).toLocaleString('en-IN')}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
/**
 * Props:
 *   cartCount   {Number}   — badge on cart icon
 *   dealer      {Object}   — { id, _id, businessName, name }
 *   onBack      {Function}
 *   onOpenCart  {Function}
 */
export default function PlaceOrderPage({
  cartCount = 0,
  dealer = {},
  onBack,
  onOpenCart,
}) {
  const [search,        setSearch]        = useState('');
  const [placedOrders,  setPlacedOrders]  = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // ── Fetch "Order Placed" orders (same endpoint as OrderManagementSection) ─
  const fetchPlacedOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      // GET /api/dealer/orders?status=Order Placed
      const res = await apiService.get(API_ENDPOINTS.ORDERS.LIST, {
        status: 'Order Placed',
        ...(search.trim() && { search: search.trim() }),
        limit: 50,
      });
      const list = res?.data || [];
      // Extra client-side guard — only "Order Placed"
      setPlacedOrders(
        (Array.isArray(list) ? list : []).filter((o) => o.status === 'Order Placed')
      );
    } catch (err) {
      console.error('[PlaceOrder] fetchPlacedOrders:', err?.message);
      setPlacedOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }, [search]);

  useEffect(() => { fetchPlacedOrders(); }, [fetchPlacedOrders]);

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>

      {/* ── Navbar ── */}
      <View style={s.navbar}>
        <Pressable onPress={onBack} style={s.navIconBtn}>
          <Icon name="arrow-left" size={24} color={C.white} />
        </Pressable>

        <Text style={s.navTitle}>Place Order</Text>

        <Pressable onPress={onOpenCart} style={s.navIconBtn}>
          <Icon name="cart-outline" size={24} color={C.white} />
          {cartCount > 0 && (
            <View style={s.cartBadge}>
              <Text style={s.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* ── Search bar ── */}
      <View style={s.searchWrap}>
        <Icon name="magnify" size={18} color={C.muted} />
        <TextInput
          style={s.searchInput}
          placeholder="Search orders…"
          placeholderTextColor={C.muted}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={fetchPlacedOrders}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <Icon name="close-circle" size={17} color={C.muted} />
          </Pressable>
        )}
      </View>

      {/* ── "Order Placed" orders list ── */}
      {loadingOrders ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.red} />
          <Text style={s.loadingText}>Loading orders…</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1, backgroundColor: C.bg }}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}>

          {placedOrders.length > 0 && (
            <View style={s.sectionTitleRow}>
              <Icon name="clipboard-check-outline" size={16} color={C.red} />
              <Text style={s.sectionTitle}>
                Order Placed ({placedOrders.length})
              </Text>
            </View>
          )}

          {placedOrders.length === 0 ? (
            <View style={s.emptyWrap}>
              <Icon name="clipboard-text-off-outline" size={52} color={C.muted} />
              <Text style={s.emptyText}>No "Order Placed" orders</Text>
            </View>
          ) : (
            placedOrders.map((order, idx) => (
              <PlacedOrderCard
                key={order.orderId || order._id || idx}
                order={order}
              />
            ))
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.red },

  // Navbar
  navbar: {
    height: 56, backgroundColor: C.red,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
  },
  navIconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  navTitle: {
    flex: 1, textAlign: 'center',
    color: C.white, fontSize: 20, fontWeight: '900',
  },
  cartBadge: {
    position: 'absolute', top: 0, right: 0,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: C.white,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  cartBadgeText: { color: C.red, fontSize: 9, fontWeight: '900' },

  // Search
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.white, borderRadius: 14,
    marginHorizontal: 14, marginTop: 12, marginBottom: 4,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: C.line, ...shadow,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.text },

  listContent: { paddingHorizontal: 14, paddingBottom: 32, backgroundColor: C.bg },

  // ── "Order Placed" section ──
  section: { marginTop: 14, marginBottom: 4 },
  sectionTitleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: '900', color: C.text },

  // "Order Placed" card
  orderCard: {
    backgroundColor: C.white,
    borderRadius: 14, borderWidth: 1, borderColor: C.line,
    padding: 14, marginBottom: 10, ...shadow,
  },
  orderTopRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 4,
  },
  orderIdRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  orderId: { fontSize: 14, fontWeight: '900', color: C.text },
  statusPill: {
    backgroundColor: C.blueBg, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  statusText: { fontSize: 9, fontWeight: '900', color: C.blue, letterSpacing: 0.5 },
  orderMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  orderMetaText: { fontSize: 11, color: C.muted, fontWeight: '600' },
  sourceChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#F1F3F5', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2, marginLeft: 2,
  },
  sourceText: { fontSize: 9, fontWeight: '700', color: C.muted },
  orderDivider: { height: 1, backgroundColor: C.line, marginBottom: 10 },

  productRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#F8F9FA', borderRadius: 10,
    padding: 10, borderWidth: 1, borderColor: '#EEEEEE',
  },
  productIcon: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: 'rgba(197,31,43,0.08)',
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  productName:     { fontSize: 13, fontWeight: '800', color: C.text, marginBottom: 2 },
  productCategory: { fontSize: 10, fontWeight: '600', color: C.muted, marginBottom: 2 },
  productCount:    { fontSize: 10, fontWeight: '700', color: C.sub },
  valueBox:        { alignItems: 'flex-end', marginLeft: 8 },
  valueAmount:     { fontSize: 14, fontWeight: '900', color: C.red },
  valueLabel:      { fontSize: 9, fontWeight: '700', color: C.muted, marginTop: 2 },

  gstRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  gstText: { fontSize: 10, fontWeight: '700', color: C.blue },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  loadingText: { marginTop: 10, fontSize: 14, color: C.muted },

  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, color: C.muted, fontWeight: '600', marginTop: 12 },
});
