/**
 * CheckoutScreen.js  –  SCREEN 3+4+5: Checkout → Place Order → Confirmation
 * POST /api/dealer/orders/create
 * Body: { items: [{ productId, quantity }], deliveryAddress, notes }
 * Header: X-Idempotency-Key (UUID) to prevent double-submit
 */
import React, { useState, useRef } from 'react';
import {
  ActivityIndicator, Alert, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, shadow } from './theme';
import orderService from './services/orderService';
import { clearCart } from './CartScreen';

// Simple UUID v4 for idempotency key
const uuid = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
};

function CheckoutScreen({ cart, grandTotal, subTotal, totalGst, onBack, onOrderSuccess, onOrderFail }) {
  const [placing, setPlacing]     = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [orderId, setOrderId]     = useState(null);
  const [error, setError]         = useState(null);
  const idempotencyKey = useRef(uuid());

  const handlePlaceOrder = async () => {
    if (placing || submitted) return;
    setPlacing(true);
    setError(null);

    try {
      const body = {
        items: cart.map((i) => ({ productId: i.id, quantity: i.quantity })),
        deliveryAddress: 'Default Delivery Address',
        notes: 'Order placed via Dealer App',
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
      if (onOrderFail) onOrderFail(msg);
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
            <Icon name="check-circle" size={72} color="#2E7D32" />
          </View>
          <Text style={cs.successTitle}>Order Placed!</Text>
          <Text style={cs.successOrderId}>Order ID: {orderId}</Text>
          <Text style={cs.successAmount}>Total: {grandTotal.toFixed(2)}</Text>
          <Text style={cs.successNote}>
            Your order is now visible in the admin panel.{'\n'}
            Track status in "My Orders".
          </Text>
          <Pressable style={cs.successBtn} onPress={() => onBack && onBack('orders')}>
            <Icon name="clipboard-list" size={20} color="#FFF" />
            <Text style={cs.successBtnText}>View My Orders</Text>
          </Pressable>
          <Pressable style={[cs.successBtn, cs.outlineBtn]} onPress={() => onBack && onBack('category')}>
            <Icon name="shopping" size={20} color={colors.red} />
            <Text style={[cs.successBtnText, { color: colors.red }]}>Continue Shopping</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={cs.screen}>
      <View style={cs.topNav}>
        <Pressable onPress={() => onBack && onBack()} style={cs.iconBtn}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </Pressable>
        <Text style={cs.navTitle}>Checkout</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={cs.content} showsVerticalScrollIndicator={false}>
        {/* Order items (read-only) */}
        <Text style={cs.sectionTitle}>Order Items ({cart.length})</Text>
        {cart.map((item) => {
          const lineGst = (item.price * (item.gst || 0) / 100) * item.quantity;
          return (
            <View key={item.id} style={cs.itemRow}>
              <View style={cs.itemIconWrap}>
                <Icon name="package-variant" size={22} color={colors.red} />
              </View>
              <View style={cs.itemInfo}>
                <Text style={cs.itemName} numberOfLines={1}>{item.name}</Text>
                <Text style={cs.itemSku}>SKU: {item.sku || '—'}  ×{item.quantity}</Text>
              </View>
              <View style={cs.itemAmt}>
                <Text style={cs.itemTotal}>{(item.price * item.quantity).toLocaleString('en-IN')}</Text>
                {item.gst > 0 && <Text style={cs.itemGst}>+{lineGst.toFixed(2)} GST</Text>}
              </View>
            </View>
          );
        })}

        {/* Price breakdown */}
        <View style={cs.summaryBox}>
          <Text style={cs.summaryTitle}>Price Breakdown</Text>
          <View style={cs.summaryRow}>
            <Text style={cs.summaryLabel}>Base Price (excl. GST)</Text>
            <Text style={cs.summaryValue}>{subTotal.toLocaleString('en-IN')}</Text>
          </View>
          <View style={cs.summaryRow}>
            <Text style={cs.summaryLabel}>GST</Text>
            <Text style={cs.summaryValue}>{totalGst.toFixed(2)}</Text>
          </View>
          <View style={cs.summaryDivider} />
          <View style={cs.summaryRow}>
            <Text style={cs.grandLabel}>Grand Total</Text>
            <Text style={cs.grandValue}>{grandTotal.toFixed(2)}</Text>
          </View>
        </View>

        {/* Error banner */}
        {error && (
          <View style={cs.errorBanner}>
            <Icon name="alert-circle-outline" size={18} color="#C62828" />
            <Text style={cs.errorText}>{error}</Text>
          </View>
        )}

        {/* Place Order button */}
        <Pressable
          style={[cs.placeBtn, placing && cs.placeBtnDisabled]}
          onPress={handlePlaceOrder}
          disabled={placing}>
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

        {/* Retry if error */}
        {error && !placing && (
          <Pressable style={cs.retryBtn} onPress={handlePlaceOrder}>
            <Text style={cs.retryText}>Retry</Text>
          </Pressable>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const cs = StyleSheet.create({
  screen: { flex:1,backgroundColor:'#F5F7FA' },
  topNav: { backgroundColor:colors.red,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:14,...shadow },
  iconBtn: { width:38,height:38,borderRadius:19,backgroundColor:'rgba(255,255,255,0.2)',alignItems:'center',justifyContent:'center' },
  navTitle: { color:'#FFF',fontSize:18,fontWeight:'900' },
  content: { padding:16 },
  sectionTitle: { color:colors.text,fontSize:16,fontWeight:'900',marginBottom:12 },
  itemRow: { flexDirection:'row',alignItems:'center',backgroundColor:'#FFF',borderRadius:12,borderWidth:1,borderColor:'#E8E8E8',padding:12,marginBottom:8,...shadow },
  itemIconWrap: { width:40,height:40,borderRadius:10,backgroundColor:'rgba(198,40,40,0.08)',alignItems:'center',justifyContent:'center',marginRight:10 },
  itemInfo: { flex:1 },
  itemName: { color:colors.text,fontSize:13,fontWeight:'800' },
  itemSku:  { color:colors.muted,fontSize:10,marginTop:2 },
  itemAmt:  { alignItems:'flex-end' },
  itemTotal: { color:colors.red,fontSize:14,fontWeight:'900' },
  itemGst:   { color:colors.muted,fontSize:10,marginTop:2 },
  summaryBox: { backgroundColor:'#FFF',borderRadius:14,borderWidth:2,borderColor:colors.red,padding:16,marginTop:14,marginBottom:12 },
  summaryTitle: { color:colors.text,fontSize:15,fontWeight:'900',marginBottom:12 },
  summaryRow: { flexDirection:'row',justifyContent:'space-between',marginBottom:8 },
  summaryLabel: { color:colors.muted,fontSize:14 },
  summaryValue: { color:colors.text,fontSize:14,fontWeight:'700' },
  summaryDivider: { height:1,backgroundColor:'#EEE',marginVertical:8 },
  grandLabel: { color:colors.text,fontSize:16,fontWeight:'900' },
  grandValue: { color:colors.red,fontSize:20,fontWeight:'900' },
  errorBanner: { flexDirection:'row',alignItems:'flex-start',gap:8,backgroundColor:'#FFEBEE',borderRadius:10,borderLeftWidth:4,borderLeftColor:'#C62828',padding:12,marginBottom:12 },
  errorText:   { flex:1,color:'#C62828',fontSize:13 },
  placeBtn: { flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,backgroundColor:colors.red,borderRadius:14,paddingVertical:16,marginTop:4 },
  placeBtnDisabled: { opacity:0.55 },
  placeBtnText: { color:'#FFF',fontSize:16,fontWeight:'900' },
  retryBtn: { alignItems:'center',marginTop:10,paddingVertical:10 },
  retryText: { color:colors.red,fontSize:14,fontWeight:'700' },
  successContainer: { flex:1,alignItems:'center',justifyContent:'center',padding:32 },
  successIconWrap: { marginBottom:16 },
  successTitle: { fontSize:26,fontWeight:'900',color:'#2E7D32',marginBottom:8 },
  successOrderId: { fontSize:16,fontWeight:'700',color:colors.text,marginBottom:4 },
  successAmount:  { fontSize:18,fontWeight:'900',color:colors.red,marginBottom:16 },
  successNote: { textAlign:'center',color:colors.muted,fontSize:13,lineHeight:20,marginBottom:24 },
  successBtn: { flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,backgroundColor:colors.red,borderRadius:12,paddingVertical:14,paddingHorizontal:28,marginBottom:12,width:'100%' },
  outlineBtn: { backgroundColor:'#FFF',borderWidth:2,borderColor:colors.red },
  successBtnText: { color:'#FFF',fontSize:15,fontWeight:'900' },
});

export default CheckoutScreen;
