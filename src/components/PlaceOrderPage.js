/**
 * PlaceOrderPage.js
 *
 * Receives a single order from My Orders (via initialOrder prop).
 * Dealer reviews the order details and confirms to place it.
 * No independent API fetching — only the order passed from My Orders is shown.
 * On confirm → POST /orders/:id/place → status becomes "Pending Approval" → ERP Admin sees it.
 */
import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import apiService from './services/apiService';

// ─── Theme ────────────────────────────────────────────────────────────────────
const C = {
  red: '#C51F2B', redDk: '#A3101B',
  bg: '#F2F0EC', white: '#FFFFFF',
  text: '#1A1A1A', sub: '#555', muted: '#888', line: '#E8E4DE',
  green: '#1A7A3C', greenBg: '#E4F5EC',
  amber: '#B86A00', amberBg: '#FEF3E2',
  blue: '#1565C0', blueBg: '#E3F0FF',
};
const sh = {
  shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
};

const fmtDate = d => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return String(d); }
};
const numFmt = n => Number(n || 0).toLocaleString('en-IN');

// ─── Info Row ─────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value, last = false }) {
  if (!value || value === '—') return null;
  return (
    <View style={[ir.row, last && { borderBottomWidth: 0 }]}>
      <View style={ir.left}>
        <Icon name={icon} size={13} color={C.muted} />
        <Text style={ir.lbl}>{label}</Text>
      </View>
      <Text style={ir.val} numberOfLines={2}>{value}</Text>
    </View>
  );
}
const ir = StyleSheet.create({
  row:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.line },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lbl:  { fontSize: 12, fontWeight: '700', color: C.muted },
  val:  { fontSize: 13, fontWeight: '700', color: C.text, textAlign: 'right', maxWidth: '55%', flexShrink: 1 },
});

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PlaceOrderPage({ onBack, initialOrder, onOrderPlaced }) {
  const [placing, setPlacing] = useState(false);

  // If no order was passed, show a friendly empty state
  if (!initialOrder) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <View style={s.navbar}>
          <Pressable onPress={onBack} style={s.backBtn}>
            <Icon name="arrow-left" size={22} color={C.white} />
          </Pressable>
          <Text style={s.navTitle}>Place Order</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={s.emptyWrap}>
          <Icon name="clipboard-arrow-up-outline" size={64} color={C.line} />
          <Text style={s.emptyTitle}>No Order Selected</Text>
          <Text style={s.emptyText}>
            Go to My Orders, create an order, then tap the{' '}
            <Text style={{ fontWeight: '800', color: C.red }}>Place</Text> button on the order card.
          </Text>
          <TouchableOpacity style={s.goBackBtn} onPress={onBack}>
            <Icon name="arrow-left" size={15} color={C.white} />
            <Text style={s.goBackTxt}>Go to My Orders</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const order = initialOrder;
  const items = Array.isArray(order.lineItems) && order.lineItems.length > 0
    ? order.lineItems
    : (order.items || []);
  const orderId = order.orderId || order.id || '—';
  const totalAmt = order.value || order.totalAmount || 0;
  const categoryName = items[0]?.category || order._categoryName || '—';
  const productName  = items[0]?.name || items[0]?.itemName || '—';
  const companyName  = order._vendorName || order.customer || '—';

  const handleConfirm = async () => {
    setPlacing(true);
    try {
      const id = order.mongodbId || order._id || order.orderId || order.id;
      const res = await apiService.post(`/orders/${id}/place`, {});
      if (res?.success) {
        Alert.alert(
          '✅ Order Placed!',
          `Order ${orderId} has been submitted to the ERP and is now Pending Approval.`,
          [{ text: 'OK', onPress: () => { if (onOrderPlaced) onOrderPlaced(); } }],
        );
      } else {
        Alert.alert('Error', res?.message || 'Could not place order.');
      }
    } catch (err) {
      Alert.alert('Error', err?.message || 'Could not place order.');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <SafeAreaView style={s.screen} edges={['top']}>

      {/* Navbar */}
      <View style={s.navbar}>
        <Pressable onPress={onBack} style={s.backBtn}>
          <Icon name="arrow-left" size={22} color={C.white} />
        </Pressable>
        <Text style={s.navTitle}>Place Order</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Order ID + Status banner */}
        <View style={s.banner}>
          <View style={s.bannerLeft}>
            <View style={s.bannerIcon}>
              <Icon name="clipboard-check-outline" size={20} color={C.red} />
            </View>
            <View>
              <Text style={s.bannerOrderId}>{orderId}</Text>
              <Text style={s.bannerDate}>{fmtDate(order.createdAt || order.orderDate)}</Text>
            </View>
          </View>
          <View style={s.statusBadge}>
            <Icon name="circle" size={7} color={C.blue} />
            <Text style={s.statusTxt}>Order Placed</Text>
          </View>
        </View>

        {/* Financial summary strip */}
        <View style={s.finStrip}>
          <View style={s.finItem}>
            <Text style={s.finLbl}>Sub Total</Text>
            <Text style={s.finVal}>₹{numFmt(order.subTotal)}</Text>
          </View>
          <View style={s.finSep} />
          <View style={s.finItem}>
            <Text style={s.finLbl}>GST</Text>
            <Text style={s.finVal}>₹{numFmt(order.totalGst)}</Text>
          </View>
          <View style={s.finSep} />
          <View style={s.finItem}>
            <Text style={s.finLbl}>Total</Text>
            <Text style={[s.finVal, { color: C.red, fontSize: 15 }]}>₹{numFmt(totalAmt)}</Text>
          </View>
        </View>

        {/* Order details card */}
        <View style={s.card}>
          <View style={s.cardHead}>
            <Icon name="information-outline" size={14} color={C.red} />
            <Text style={s.cardTitle}>Order Details</Text>
          </View>
          <InfoRow icon="receipt"            label="Order ID"       value={orderId} />
          <InfoRow icon="office-building"    label="Company"        value={companyName} />
          <InfoRow icon="tag-outline"        label="Category"       value={categoryName} />
          <InfoRow icon="package-variant"    label="Product"        value={productName} />
          <InfoRow icon="counter"            label="Quantity"       value={items[0]?.quantity ? String(items[0].quantity) : null} />
          <InfoRow icon="cash-multiple"      label="Payment Mode"   value={order.paymentMode} />
          <InfoRow icon="priority-high"      label="Priority"       value={order.priority} />
          <InfoRow icon="calendar-check"     label="Delivery Date"  value={fmtDate(order.expectedDeliveryDate)} />
          <InfoRow icon="map-marker-outline" label="Delivery Address" value={order.deliveryAddress} />
          <InfoRow icon="pound-box-outline"  label="PO Number"      value={order.poNumber} />
          <InfoRow icon="identifier"         label="Reference No."  value={order.referenceNumber} />
          <InfoRow icon="note-text-outline"  label="Remarks"        value={order.remarks || order.notes} last />
        </View>

        {/* Line items */}
        {items.length > 0 && (
          <View style={s.card}>
            <View style={s.cardHead}>
              <Icon name="package-variant" size={14} color={C.red} />
              <Text style={s.cardTitle}>Items ({items.length})</Text>
            </View>
            {items.map((it, i) => (
              <View key={i} style={[s.itemRow, i < items.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.line }]}>
                <View style={s.itemIcon}>
                  <Icon name="package-variant" size={14} color={C.red} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.itemName}>{it.name || it.itemName || 'Item'}</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                    <Text style={s.itemMeta}>Qty: <Text style={s.itemMetaVal}>{it.quantity || 1}</Text></Text>
                    <Text style={s.itemMeta}>Unit: <Text style={s.itemMetaVal}>₹{numFmt(it.unitPrice)}</Text></Text>
                    {it.gstPercent > 0 && <Text style={s.itemMeta}>GST: <Text style={s.itemMetaVal}>{it.gstPercent}%</Text></Text>}
                  </View>
                </View>
                <Text style={s.itemTotal}>₹{numFmt(it.total)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* What happens next info box */}
        <View style={s.infoBox}>
          <Icon name="information-outline" size={16} color={C.blue} />
          <Text style={s.infoTxt}>
            Placing this order will submit it to the ERP Admin for approval. Status will change to{' '}
            <Text style={{ fontWeight: '800' }}>Pending Approval</Text>.
          </Text>
        </View>

        {/* Action buttons */}
        <View style={s.actions}>
          <Pressable style={s.cancelBtn} onPress={onBack} disabled={placing}>
            <Text style={s.cancelTxt}>Cancel</Text>
          </Pressable>
          <TouchableOpacity
            style={[s.placeBtn, placing && s.placeBtnDim]}
            onPress={handleConfirm}
            disabled={placing}
          >
            {placing
              ? <ActivityIndicator color={C.white} size="small" />
              : <>
                  <Icon name="send-circle-outline" size={18} color={C.white} />
                  <Text style={s.placeTxt}>Place Order</Text>
                </>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: C.red },
  navbar:      { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 12 },
  backBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  navTitle:    { flex: 1, fontSize: 17, fontWeight: '900', color: C.white, letterSpacing: 0.3 },

  // Empty state
  emptyWrap:   { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg, paddingHorizontal: 36 },
  emptyTitle:  { fontSize: 18, fontWeight: '900', color: C.text, marginTop: 16 },
  emptyText:   { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  goBackBtn:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.red, borderRadius: 12, paddingHorizontal: 22, paddingVertical: 13, marginTop: 24 },
  goBackTxt:   { color: C.white, fontSize: 14, fontWeight: '900' },

  // Banner
  banner:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.white, marginHorizontal: 12, marginTop: 12, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.line, ...sh },
  bannerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bannerIcon:  { width: 40, height: 40, borderRadius: 10, backgroundColor: '#FFF0F0', alignItems: 'center', justifyContent: 'center' },
  bannerOrderId: { fontSize: 15, fontWeight: '900', color: C.text },
  bannerDate:  { fontSize: 11, color: C.muted, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.blueBg, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  statusTxt:   { fontSize: 11, fontWeight: '900', color: C.blue, textTransform: 'uppercase' },

  // Financial strip
  finStrip:    { flexDirection: 'row', backgroundColor: C.white, marginHorizontal: 12, marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: C.line, overflow: 'hidden', ...sh },
  finItem:     { flex: 1, alignItems: 'center', paddingVertical: 14 },
  finSep:      { width: 1, backgroundColor: C.line },
  finLbl:      { fontSize: 10, fontWeight: '700', color: C.muted, marginBottom: 4 },
  finVal:      { fontSize: 14, fontWeight: '900', color: C.text },

  // Card
  card:        { backgroundColor: C.white, marginHorizontal: 12, marginTop: 10, borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 14, ...sh },
  cardHead:    { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  cardTitle:   { fontSize: 12, fontWeight: '900', color: C.red, letterSpacing: 0.5, textTransform: 'uppercase' },

  // Line items
  itemRow:     { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, gap: 10 },
  itemIcon:    { width: 30, height: 30, borderRadius: 8, backgroundColor: '#FFF0F0', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  itemName:    { fontSize: 13, fontWeight: '800', color: C.text },
  itemMeta:    { fontSize: 10, color: C.muted, fontWeight: '600' },
  itemMetaVal: { color: C.text, fontWeight: '700' },
  itemTotal:   { fontSize: 14, fontWeight: '900', color: C.red },

  // Info box
  infoBox:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: C.blueBg, marginHorizontal: 12, marginTop: 10, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#C5D8F5' },
  infoTxt:     { flex: 1, fontSize: 12, color: C.blue, lineHeight: 18 },

  // Actions
  actions:     { flexDirection: 'row', gap: 10, marginHorizontal: 12, marginTop: 16 },
  cancelBtn:   { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.white },
  cancelTxt:   { fontSize: 14, fontWeight: '700', color: C.sub },
  placeBtn:    { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.green, borderRadius: 12, paddingVertical: 14 },
  placeBtnDim: { backgroundColor: '#B0BEC5' },
  placeTxt:    { color: C.white, fontSize: 15, fontWeight: '900' },
});
