/**
 * CartScreen.js  –  SCREEN 2: Cart Review (local-only, persists via AsyncStorage)
 * No backend calls. Shows items, qty edit, GST split, Grand Total.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator, Alert, Pressable, ScrollView,
  StyleSheet, Text, View, RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, shadow } from './theme';

export const CART_KEY = 'dealer_cart_v1';

export const loadCart = async () => {
  try { const r = await AsyncStorage.getItem(CART_KEY); return r ? JSON.parse(r) : []; }
  catch { return []; }
};

export const saveCart = async (cart) => {
  try { await AsyncStorage.setItem(CART_KEY, JSON.stringify(cart)); }
  catch (e) { console.warn('Cart save:', e); }
};

export const clearCart = async () => {
  try { await AsyncStorage.removeItem(CART_KEY); }
  catch (e) { console.warn('Cart clear:', e); }
};

function CartScreen({ onBack, onCheckout }) {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { init(); }, []);

  const init = async () => {
    setLoading(true);
    const saved = await loadCart();
    setCart(saved);
    setLoading(false);
  };

  const update = async (newCart) => { setCart(newCart); await saveCart(newCart); };

  const updateQty = async (id, delta, moq, maxStock) => {
    const newCart = cart.map((i) => {
      if (i.id !== id) return i;
      const next = Math.max(moq || 1, Math.min(maxStock || 9999, i.quantity + delta));
      return { ...i, quantity: next };
    });
    await update(newCart);
  };

  const removeItem = async (id) => {
    Alert.alert('Remove Item', 'Remove this item from cart?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        const newCart = cart.filter((i) => i.id !== id);
        await update(newCart);
      }},
    ]);
  };

  // Totals
  const subTotal  = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalGst  = cart.reduce((s, i) => s + (i.price * (i.gst || 0) / 100) * i.quantity, 0);
  const grandTotal = subTotal + totalGst;

  if (loading) return (
    <View style={[ss.screen, ss.center]}>
      <ActivityIndicator size="large" color={colors.red} />
    </View>
  );

  return (
    <View style={ss.screen}>
      <View style={ss.topNav}>
        <Pressable onPress={onBack} style={ss.iconBtn}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </Pressable>
        <Text style={ss.navTitle}>Cart ({cart.length})</Text>
        {cart.length > 0 && (
          <Pressable onPress={() => Alert.alert('Clear Cart', 'Remove all items?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Clear', style: 'destructive', onPress: async () => { await update([]); } },
          ])} style={ss.iconBtn}>
            <Icon name="trash-can-outline" size={22} color="#FFF" />
          </Pressable>
        )}
        {cart.length === 0 && <View style={{ width: 38 }} />}
      </View>

      {cart.length === 0 ? (
        <View style={[ss.screen, ss.center]}>
          <Icon name="cart-outline" size={64} color={colors.muted} />
          <Text style={ss.emptyTitle}>Your cart is empty</Text>
          <Text style={ss.emptyText}>Browse categories to add products</Text>
          <Pressable style={ss.browseBtn} onPress={onBack}>
            <Text style={ss.browseBtnText}>Browse Products</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={ss.listContent} showsVerticalScrollIndicator={false}>
          {cart.map((item) => {
            const lineSubTotal = item.price * item.quantity;
            const lineGst      = (item.price * (item.gst || 0) / 100) * item.quantity;
            const lineTotal    = lineSubTotal + lineGst;
            return (
              <View key={item.id} style={ss.card}>
                <View style={ss.cardTop}>
                  <View style={ss.iconWrap}>
                    <Icon name="package-variant" size={26} color={colors.red} />
                  </View>
                  <View style={ss.cardBody}>
                    <Text style={ss.itemName} numberOfLines={2}>{item.name}</Text>
                    <Text style={ss.itemSku}>SKU: {item.sku || '—'}</Text>
                    <Text style={ss.itemCat}>{item.category || 'Uncategorized'}</Text>
                    <View style={ss.priceRow}>
                      <Text style={ss.unitPrice}>{item.price.toLocaleString('en-IN')}/unit</Text>
                      {item.gst > 0 && <Text style={ss.gstChip}>+{item.gst}% GST</Text>}
                    </View>
                  </View>
                  <Pressable onPress={() => removeItem(item.id)} style={ss.removeBtn}>
                    <Icon name="close" size={18} color={colors.muted} />
                  </Pressable>
                </View>

                <View style={ss.cardBottom}>
                  <View style={ss.stepper}>
                    <Pressable style={ss.stepBtn} onPress={() => updateQty(item.id, -(item.moq||1), item.moq||1, item.stock)}>
                      <Icon name="minus" size={14} color={colors.red} />
                    </Pressable>
                    <Text style={ss.stepQty}>{item.quantity}</Text>
                    <Pressable style={ss.stepBtn} onPress={() => updateQty(item.id, item.moq||1, item.moq||1, item.stock)}>
                      <Icon name="plus" size={14} color={colors.red} />
                    </Pressable>
                  </View>
                  <View style={ss.lineTotal}>
                    <Text style={ss.lineTotalBase}>{lineSubTotal.toLocaleString('en-IN')}</Text>
                    {item.gst > 0 && <Text style={ss.lineTotalGst}>+{lineGst.toFixed(2)} GST</Text>}
                    <Text style={ss.lineTotalFinal}>= {lineTotal.toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            );
          })}

          {/* Summary */}
          <View style={ss.summaryCard}>
            <Text style={ss.summaryTitle}>Order Summary</Text>
            <View style={ss.summaryRow}>
              <Text style={ss.summaryLabel}>Subtotal ({cart.length} items)</Text>
              <Text style={ss.summaryValue}>{subTotal.toLocaleString('en-IN')}</Text>
            </View>
            <View style={ss.summaryRow}>
              <Text style={ss.summaryLabel}>GST</Text>
              <Text style={ss.summaryValue}>{totalGst.toFixed(2)}</Text>
            </View>
            <View style={ss.summaryDivider} />
            <View style={ss.summaryRow}>
              <Text style={ss.grandLabel}>Grand Total</Text>
              <Text style={ss.grandValue}>{grandTotal.toFixed(2)}</Text>
            </View>
            <Pressable style={ss.checkoutBtn} onPress={() => onCheckout(cart, grandTotal, subTotal, totalGst)}>
              <Icon name="arrow-right-circle" size={22} color="#FFF" />
              <Text style={ss.checkoutBtnText}>Proceed to Checkout</Text>
            </Pressable>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const ss = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F7FA' },
  center: { justifyContent: 'center', alignItems: 'center' },
  topNav: {
    backgroundColor: colors.red, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, ...shadow,
  },
  iconBtn: { width:38,height:38,borderRadius:19,backgroundColor:'rgba(255,255,255,0.2)',alignItems:'center',justifyContent:'center' },
  navTitle: { color:'#FFF',fontSize:18,fontWeight:'900' },
  listContent: { padding: 16 },
  emptyTitle: { color:colors.text,fontSize:18,fontWeight:'900',marginTop:16 },
  emptyText:  { color:colors.muted,fontSize:14,marginTop:6,textAlign:'center',paddingHorizontal:30 },
  browseBtn:  { marginTop:20,backgroundColor:colors.red,borderRadius:10,paddingHorizontal:24,paddingVertical:12 },
  browseBtnText: { color:'#FFF',fontSize:15,fontWeight:'800' },
  card: { backgroundColor:'#FFF',borderRadius:14,borderWidth:1,borderColor:'#E8E8E8',padding:14,marginBottom:12,...shadow },
  cardTop: { flexDirection:'row',alignItems:'flex-start',marginBottom:10 },
  iconWrap: { width:46,height:46,borderRadius:12,backgroundColor:'rgba(198,40,40,0.08)',alignItems:'center',justifyContent:'center',marginRight:10 },
  cardBody: { flex:1 },
  itemName: { color:colors.text,fontSize:14,fontWeight:'800',marginBottom:3 },
  itemSku:  { color:colors.muted,fontSize:10,marginBottom:2 },
  itemCat:  { color:colors.muted,fontSize:10,marginBottom:4 },
  priceRow: { flexDirection:'row',alignItems:'center',gap:8 },
  unitPrice: { color:colors.red,fontSize:13,fontWeight:'700' },
  gstChip:  { backgroundColor:'rgba(198,40,40,0.1)',borderRadius:6,paddingHorizontal:6,paddingVertical:2,fontSize:10,color:colors.red,fontWeight:'700' },
  removeBtn: { padding:4 },
  cardBottom: { flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderTopWidth:1,borderTopColor:'#F0F0F0',paddingTop:10 },
  stepper: { flexDirection:'row',alignItems:'center',gap:8,borderWidth:1,borderColor:colors.red,borderRadius:8,paddingHorizontal:6,paddingVertical:4 },
  stepBtn: { width:28,height:28,borderRadius:14,backgroundColor:'rgba(198,40,40,0.08)',alignItems:'center',justifyContent:'center' },
  stepQty: { color:colors.text,fontSize:14,fontWeight:'900',minWidth:28,textAlign:'center' },
  lineTotal: { alignItems:'flex-end' },
  lineTotalBase: { color:colors.muted,fontSize:11 },
  lineTotalGst:  { color:colors.muted,fontSize:10 },
  lineTotalFinal:{ color:colors.text,fontSize:14,fontWeight:'900' },
  summaryCard: { backgroundColor:'#FFF',borderRadius:16,borderWidth:2,borderColor:colors.red,padding:16,marginTop:6 },
  summaryTitle: { color:colors.text,fontSize:16,fontWeight:'900',marginBottom:14 },
  summaryRow: { flexDirection:'row',justifyContent:'space-between',marginBottom:8 },
  summaryLabel: { color:colors.muted,fontSize:14 },
  summaryValue: { color:colors.text,fontSize:14,fontWeight:'700' },
  summaryDivider:{ height:1,backgroundColor:'#EEE',marginVertical:10 },
  grandLabel: { color:colors.text,fontSize:16,fontWeight:'900' },
  grandValue: { color:colors.red,fontSize:20,fontWeight:'900' },
  checkoutBtn: { flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,backgroundColor:colors.red,borderRadius:12,paddingVertical:14,marginTop:14 },
  checkoutBtnText: { color:'#FFF',fontSize:16,fontWeight:'900' },
});

export default CartScreen;
