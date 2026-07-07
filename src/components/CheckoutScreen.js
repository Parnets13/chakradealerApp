/**
 * CheckoutScreen.js  –  Checkout / Place Order screen
 *
 * Flow: CategoryPage → CartScreen → CheckoutScreen
 *
 * POST /api/dealer/orders/create
 * Body: { items: [{ productId, quantity }], deliveryAddress, notes, priority }
 *   — Backend fetches product details from ItemMaster, builds lineItems,
 *     computes subTotal / totalGst / value, and sets source:'DealerApp',
 *     customer, dealerId from the authenticated JWT.
 *
 * Validation BEFORE allowing Place Order:
 *   • cart.length > 0
 *   • every item has quantity > 0 and price > 0
 *
 * On SUCCESS: clear cart, show success screen (orderId + total), "View Orders" button.
 * On FAILURE: show error banner, preserve cart data.
 */
import React, { useState, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, shadow } from './theme';
import orderService from './services/orderService';
import { clearCart } from './CartScreen';

// ─── Simple UUID v4 for idempotency key ───────────────────────────────────────
const uuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

// ─── Validation helpers ───────────────────────────────────────────────────────
const validateCart = (cart) => {
  if (!Array.isArray(cart) || cart.length === 0) {
    return { valid: false, reason: 'Cart is empty. Add products before placing an order.' };
  }
  for (const item of cart) {
    if (!item.quantity || item.quantity <= 0) {
      return { valid: false, reason: `"${item.name || 'Item'}" has invalid quantity (must be > 0).` };
    }
    if (!item.price || item.price <= 0) {
      return { valid: false, reason: `"${item.name || 'Item'}" has invalid price (₹0 or missing).` };
    }
    if (!item.id) {
      return { valid: false, reason: `"${item.name || 'Item'}" is missing product ID.` };
    }
  }
  return { valid: true, reason: null };
};

// ─── Format helpers ───────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Main Component ───────────────────────────────────────────────────────────
function CheckoutScreen({
  cart,
  grandTotal,
  subTotal,
  totalGst,
  onBack,
  onOrderSuccess,  // called with orderId after success → navigates to orders
}) {
  const [placing,   setPlacing]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [orderId,   setOrderId]   = useState(null);
  const [error,     setError]     = useState(null);
  const idempotencyKey = useRef(uuid());

  // Validate cart up-front
  const validation = validateCart(cart);

  const handlePlaceOrder = async () => {
    if (placing || submitted) return;

    // Guard: must not be callable if cart is invalid
    if (!validation.valid) {
      setError(validation.reason);
      return;
    }

    setPlacing(true);
    setError(null);

    try {
      /**
       * POST body the backend expects:
       *   items: [{ productId, quantity }]
       *
       * Backend (dealerOrderController.createDealerOrder) handles:
       *   - Fetching product details (name, sku, unitPrice, gstPercent) from ItemMaster
       *   - Building lineItems array
       *   - Computing subTotal, totalGst, value
       *   - Setting customer, dealerId, source:'DealerApp' from req.dealer (JWT)
       */
      const body = {
        items: cart.map((i) => ({
          productId: i.id,
          quantity:  i.quantity,
        })),
        priority:        'Normal',
        deliveryAddress: '',       // dealer profile address not yet wired — backend handles empty
        notes:           'Order placed via Dealer App',
      };

      const response = await orderService.createOrder(body, idempotencyKey.current);

      if (response && response.success) {
        const newOrderId = response.data?.orderId || response.data?.id || '—';
        setOrderId(newOrderId);
        setSubmitted(true);
        await clearCart();
        if (onOrderSuccess) onOrderSuccess(newOrderId);
      } else {
        throw new Error(response?.message || 'Order creation failed');
      }
    } catch (err) {
      const msg = err.message || 'Failed to place order. Please try again.';
      setError(msg);
      // Cart data is preserved — setPlacing(false) below keeps the screen alive
    } finally {
      setPlacing(false);
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (submitted && orderId) {
    return (
      <View style={cs.screen}>
        <View style={cs.successContainer}>
          <View style={cs.successIconWrap}>
            <Icon name="check-circle" size={80} color="#2E7D32" />
          </View>
          <Text style={cs.successTitle}>Order Placed!</Text>
          <Text style={cs.successOrderId}>Order ID: {orderId}</Text>
          <Text style={cs.successAmount}>Total: ₹{fmt(grandTotal)}</Text>
          <Text style={cs.successNote}>
            Your order is now visible in the admin panel.{'\n'}
            Track its status in "My Orders".
          </Text>

          {/* View My Orders */}
          <Pressable style={cs.successBtn} onPress={() => onBack && onBack('orders')}>
            <Icon name="clipboard-list" size={20} color="#FFF" />
            <Text style={cs.successBtnText}>View My Orders</Text>
          </Pressable>

          {/* Continue Shopping */}
          <Pressable style={[cs.successBtn, cs.outlineBtn]} onPress={() => onBack && onBack('category')}>
            <Icon name="shopping" size={20} color={colors.red} />
            <Text style={[cs.successBtnText, { color: colors.red }]}>Continue Shopping</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Checkout screen ───────────────────────────────────────────────────────
  const canPlaceOrder = validation.valid && !placing;

  return (
    <View style={cs.screen}>
      {/* Navbar */}
      <View style={cs.topNav}>
        <Pressable onPress={() => onBack && onBack()} style={cs.iconBtn}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </Pressable>
        <Text style={cs.navTitle}>Order Summary</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={cs.content} showsVerticalScrollIndicator={false}>

        {/* ── Cart empty / invalid warning (shown even before tap) ── */}
        {!validation.valid && (
          <View style={cs.warnBanner}>
            <Icon name="alert-circle-outline" size={18} color="#B86A00" />
            <Text style={cs.warnText}>{validation.reason}</Text>
          </View>
        )}

        {/* ── Line items (read-only) ── */}
        {Array.isArray(cart) && cart.length > 0 && (
          <>
            <Text style={cs.sectionTitle}>Items ({cart.length})</Text>
            {cart.map((item, idx) => {
              const lineBase = item.price * item.quantity;
              const lineGst  = (item.price * (item.gst || 0) / 100) * item.quantity;
              const lineTotal = lineBase + lineGst;
              return (
                <View key={item.id || idx} style={cs.itemRow}>
                  <View style={cs.itemIconWrap}>
                    <Icon name="package-variant" size={22} color={colors.red} />
                  </View>
                  <View style={cs.itemInfo}>
                    <Text style={cs.itemName} numberOfLines={2}>{item.name || '—'}</Text>
                    <Text style={cs.itemMeta}>
                      {item.category ? `Category: ${item.category}` : ''}
                      {item.category && item.sku ? '  ·  ' : ''}
                      {item.sku ? `SKU: ${item.sku}` : ''}
                    </Text>
                    <Text style={cs.itemQtyLine}>
                      Qty: {item.quantity}  @  ₹{fmt(item.price)}
                      {item.gst > 0 ? `  +${item.gst}% GST` : ''}
                    </Text>
                  </View>
                  <View style={cs.itemAmt}>
                    <Text style={cs.itemTotal}>₹{fmt(lineTotal)}</Text>
                    {item.gst > 0 && (
                      <Text style={cs.itemGst}>incl. ₹{fmt(lineGst)} GST</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* ── Price breakdown ── */}
        <View style={cs.summaryBox}>
          <Text style={cs.summaryTitle}>Price Breakdown</Text>

          <View style={cs.summaryRow}>
            <Text style={cs.summaryLabel}>Subtotal (excl. GST)</Text>
            <Text style={cs.summaryValue}>₹{fmt(subTotal)}</Text>
          </View>

          <View style={cs.summaryRow}>
            <Text style={cs.summaryLabel}>GST Total</Text>
            <Text style={cs.summaryValue}>₹{fmt(totalGst)}</Text>
          </View>

          <View style={cs.summaryDivider} />

          <View style={cs.summaryRow}>
            <Text style={cs.grandLabel}>Grand Total</Text>
            <Text style={cs.grandValue}>₹{fmt(grandTotal)}</Text>
          </View>
        </View>

        {/* ── Error banner (POST failure) ── */}
        {error && (
          <View style={cs.errorBanner}>
            <Icon name="alert-circle-outline" size={18} color="#C62828" />
            <Text style={cs.errorText}>{error}</Text>
          </View>
        )}

        {/* ── Place Order button ── */}
        <Pressable
          style={[cs.placeBtn, !canPlaceOrder && cs.placeBtnDisabled]}
          onPress={handlePlaceOrder}
          disabled={!canPlaceOrder}>
          {placing ? (
            <>
              <ActivityIndicator size="small" color="#FFF" />
              <Text style={cs.placeBtnText}>Placing Order…</Text>
            </>
          ) : (
            <>
              <Icon name="check-circle-outline" size={22} color="#FFF" />
              <Text style={cs.placeBtnText}>Place Order</Text>
            </>
          )}
        </Pressable>

        {/* Disabled reason hint */}
        {!validation.valid && (
          <Text style={cs.disabledHint}>
            Place Order is disabled: {validation.reason}
          </Text>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const cs = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: '#F5F7FA' },

  topNav: {
    backgroundColor: colors.red,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...shadow,
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  navTitle: { color: '#FFF', fontSize: 18, fontWeight: '900' },

  content: { padding: 16 },

  // Warn banner (empty / invalid cart)
  warnBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 10, borderLeftWidth: 4, borderLeftColor: '#F59E0B',
    padding: 12, marginBottom: 14,
  },
  warnText: { flex: 1, color: '#92400E', fontSize: 13 },

  sectionTitle: {
    color: '#1A2332', fontSize: 16, fontWeight: '900', marginBottom: 12,
  },

  // Item card
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1, borderColor: '#E8E8E8',
    padding: 12, marginBottom: 8,
    ...shadow,
  },
  itemIconWrap: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: 'rgba(198,40,40,0.08)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10, marginTop: 2,
  },
  itemInfo: { flex: 1 },
  itemName: { color: '#1A2332', fontSize: 13, fontWeight: '800', marginBottom: 3 },
  itemMeta: { color: '#718096', fontSize: 10, marginBottom: 2 },
  itemQtyLine: { color: '#4A5568', fontSize: 11, fontWeight: '600' },
  itemAmt:  { alignItems: 'flex-end', marginLeft: 8 },
  itemTotal: { color: colors.red, fontSize: 14, fontWeight: '900' },
  itemGst:   { color: '#718096', fontSize: 10, marginTop: 2 },

  // Summary box
  summaryBox: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.red,
    padding: 16,
    marginTop: 12,
    marginBottom: 12,
  },
  summaryTitle: { color: '#1A2332', fontSize: 15, fontWeight: '900', marginBottom: 12 },
  summaryRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { color: '#718096', fontSize: 14 },
  summaryValue: { color: '#1A2332', fontSize: 14, fontWeight: '700' },
  summaryDivider: { height: 1, backgroundColor: '#EEE', marginVertical: 8 },
  grandLabel:   { color: '#1A2332', fontSize: 16, fontWeight: '900' },
  grandValue:   { color: colors.red, fontSize: 20, fontWeight: '900' },

  // Error banner (POST fail)
  errorBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FFEBEE',
    borderRadius: 10, borderLeftWidth: 4, borderLeftColor: '#C62828',
    padding: 12, marginBottom: 12,
  },
  errorText: { flex: 1, color: '#C62828', fontSize: 13 },

  // Place Order button
  placeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: colors.red,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 4,
  },
  placeBtnDisabled: { opacity: 0.45 },
  placeBtnText: { color: '#FFF', fontSize: 16, fontWeight: '900' },

  disabledHint: {
    textAlign: 'center',
    color: '#718096',
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },

  // ── Success screen ─────────────────────────────────────────────────────────
  successContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  successIconWrap: { marginBottom: 16 },
  successTitle:   { fontSize: 26, fontWeight: '900', color: '#2E7D32', marginBottom: 8 },
  successOrderId: { fontSize: 16, fontWeight: '700', color: '#1A2332', marginBottom: 4 },
  successAmount:  { fontSize: 18, fontWeight: '900', color: colors.red, marginBottom: 16 },
  successNote: {
    textAlign: 'center', color: '#718096',
    fontSize: 13, lineHeight: 20, marginBottom: 24,
  },
  successBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: colors.red,
    borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 28,
    marginBottom: 12, width: '100%',
  },
  outlineBtn: {
    backgroundColor: '#FFF',
    borderWidth: 2, borderColor: colors.red,
  },
  successBtnText: { color: '#FFF', fontSize: 15, fontWeight: '900' },
});

export default CheckoutScreen;
