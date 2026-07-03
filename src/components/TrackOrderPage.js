/**
 * TrackOrderPage.js  –  SCREEN 7: Track Order
 * GET /api/dealer/orders/:id  (uses order data already passed from OrdersPage)
 * Pull-to-refresh syncs latest status from backend.
 *
 * 16-step status stepper (exact labels from SalesOrder.status enum).
 * Rejected / Cancelled → clear banner instead of stepper.
 * statusHistory array used if present for timeline detail.
 * App never mutates status — GET only.
 */
import React, { useState, useCallback } from 'react';
import {
  ActivityIndicator, Alert, Pressable, ScrollView,
  StyleSheet, Text, View, RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, shadow } from './theme';
import orderService from './services/orderService';
import { ALL_STATUSES, STATUS_STYLE } from './OrdersPage';

// Stepper stages (in order)
const STAGES = [
  'Order Placed', 'Pending Approval', 'Approved',
  'Picking Started', 'Picking Completed',
  'Sorting Started', 'Sorting Completed',
  'Packing Started', 'Packing Completed',
  'Invoice Generated', 'Ready for Dispatch',
  'Dispatched', 'In Transit', 'Delivered',
];

const TERMINAL_BAD = ['Rejected', 'Cancelled'];

const fmtDate = (d) => {
  if (!d) return '';
  try { return new Date(d).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }); }
  catch { return String(d); }
};

function TrackOrderPage({ order: initialOrder, onBack }) {
  const [order, setOrder]       = useState(initialOrder);
  const [refreshing, setRefresh] = useState(false);

  const refresh = useCallback(async () => {
    if (!initialOrder?.id) return;
    setRefresh(true);
    try {
      const res = await orderService.getOrderById(initialOrder.id);
      if (res && res.success && res.data) setOrder(res.data);
    } catch (err) {
      // silently ignore; show stale data
    } finally {
      setRefresh(false);
    }
  }, [initialOrder?.id]);

  if (!order) {
    return (
      <View style={[ts.screen, ts.center]}>
        <Text style={{ color: colors.muted }}>No order data</Text>
        <Pressable onPress={onBack} style={ts.backBtn}>
          <Text style={ts.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const st = STATUS_STYLE[order.status] || { color: colors.muted, bg: '#F2F2F2' };
  const isTerminalBad = TERMINAL_BAD.includes(order.status);
  const currentStageIdx = STAGES.indexOf(order.status);
  const stageProgress = currentStageIdx >= 0 ? currentStageIdx : -1;

  const useLineItems = Array.isArray(order.lineItems) && order.lineItems.length > 0;
  const itemsArr = useLineItems ? order.lineItems : [];
  const statusHistory = Array.isArray(order.statusHistory) ? order.statusHistory : [];

  return (
    <View style={ts.screen}>
      {/* Top nav */}
      <View style={ts.topNav}>
        <Pressable onPress={onBack} style={ts.iconBtn}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </Pressable>
        <Text style={ts.navTitle}>Track Order</Text>
        <Pressable onPress={refresh} style={ts.iconBtn}>
          <Icon name="refresh" size={20} color="#FFF" />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={ts.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.red]} />}>

        {/* Order header card */}
        <View style={ts.headerCard}>
          <View style={ts.headerTop}>
            <View>
              <Text style={ts.orderId}>{order.id}</Text>
              <Text style={ts.orderDate}>{fmtDate(order.orderDate || order.createdAt)}</Text>
            </View>
            <View style={[ts.badge, { backgroundColor: st.bg }]}>
              <Text style={[ts.badgeText, { color: st.color }]}>{order.status}</Text>
            </View>
          </View>
          <View style={ts.headerMeta}>
            <View style={ts.metaItem}>
              <Text style={ts.metaLabel}>ITEMS</Text>
              <Text style={ts.metaVal}>{order.totalItems || itemsArr.length || 0}</Text>
            </View>
            <View style={ts.metaItem}>
              <Text style={ts.metaLabel}>VALUE</Text>
              <Text style={[ts.metaVal, { color: colors.red }]}>{order.amount || '0'}</Text>
            </View>
            <View style={ts.metaItem}>
              <Text style={ts.metaLabel}>PRIORITY</Text>
              <Text style={[ts.metaVal, (order.priority==='Urgent'||order.priority==='High') && { color: colors.red }]}>
                {order.priority || 'Normal'}
              </Text>
            </View>
          </View>
        </View>

        {/* Terminal-bad banner */}
        {isTerminalBad && (
          <View style={[ts.terminalBanner, { backgroundColor: st.bg, borderLeftColor: st.color }]}>
            <Icon name={order.status === 'Rejected' ? 'close-circle' : 'cancel'} size={22} color={st.color} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[ts.terminalTitle, { color: st.color }]}>{order.status}</Text>
              {order.rejectionReason ? (
                <Text style={ts.terminalNote}>Reason: {order.rejectionReason}</Text>
              ) : order.cancellationReason ? (
                <Text style={ts.terminalNote}>Reason: {order.cancellationReason}</Text>
              ) : null}
            </View>
          </View>
        )}

        {/* 14-stage stepper (only for non-terminal-bad orders) */}
        {!isTerminalBad && (
          <View style={ts.stepperCard}>
            <Text style={ts.stepperTitle}>Order Progress</Text>
            {STAGES.map((stage, idx) => {
              const done    = idx < currentStageIdx;
              const current = idx === currentStageIdx;
              const pending = idx > currentStageIdx;
              // Find history entry for this stage
              const histEntry = statusHistory.find((h) => h.status === stage);

              return (
                <View key={stage} style={ts.stageRow}>
                  {/* Line before circle */}
                  <View style={ts.stageLeft}>
                    <View style={[
                      ts.stageDot,
                      done    && ts.stageDotDone,
                      current && ts.stageDotCurrent,
                    ]}>
                      {done    && <Icon name="check" size={10} color="#FFF" />}
                      {current && <Icon name="circle-slice-8" size={10} color="#FFF" />}
                      {pending && <View style={ts.stageDotInner} />}
                    </View>
                    {idx < STAGES.length - 1 && (
                      <View style={[ts.stageLine, (done || current) && ts.stageLineDone]} />
                    )}
                  </View>

                  {/* Label & date */}
                  <View style={ts.stageContent}>
                    <Text style={[
                      ts.stageLabel,
                      done    && ts.stageLabelDone,
                      current && ts.stageLabelCurrent,
                      pending && ts.stageLabelPending,
                    ]}>{stage}</Text>
                    {histEntry?.at && (
                      <Text style={ts.stageDate}>{fmtDate(histEntry.at)}</Text>
                    )}
                    {histEntry?.note && histEntry.note !== stage && (
                      <Text style={ts.stageNote}>{histEntry.note}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Dispatch info (after Dispatched) */}
        {(order.status === 'Dispatched' || order.status === 'In Transit' || order.status === 'Delivered') && order.dispatchInfo && (
          <View style={ts.infoCard}>
            <Text style={ts.infoCardTitle}>Dispatch Info</Text>
            {order.dispatchInfo.transportName ? (
              <Text style={ts.infoLine}>Courier: {order.dispatchInfo.transportName}</Text>
            ) : null}
            {order.dispatchInfo.lrNumber ? (
              <Text style={ts.infoLine}>AWB / LR: {order.dispatchInfo.lrNumber}</Text>
            ) : null}
            {order.dispatchInfo.vehicleNumber ? (
              <Text style={ts.infoLine}>Vehicle: {order.dispatchInfo.vehicleNumber}</Text>
            ) : null}
            {order.dispatchInfo.dispatchDate ? (
              <Text style={ts.infoLine}>Dispatch Date: {fmtDate(order.dispatchInfo.dispatchDate)}</Text>
            ) : null}
          </View>
        )}

        {/* Items */}
        {itemsArr.length > 0 && (
          <View style={ts.itemsCard}>
            <Text style={ts.infoCardTitle}>Items ({itemsArr.length})</Text>
            {itemsArr.map((item, idx) => (
              <View key={idx} style={ts.itemRow}>
                <View style={ts.itemIcon}>
                  <Icon name="package-variant" size={18} color={colors.red} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={ts.itemName} numberOfLines={1}>{item.name || item.itemName || 'Item'}</Text>
                  {item.sku ? <Text style={ts.itemSku}>SKU: {item.sku}</Text> : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={ts.itemQty}>×{item.quantity || 0}</Text>
                  {item.total > 0 && <Text style={ts.itemTotal}>{item.total.toLocaleString('en-IN')}</Text>}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Invoice chip */}
        {order.status === 'Invoice Generated' && (
          <View style={ts.invoiceBanner}>
            <Icon name="file-document-check-outline" size={20} color="#1565C0" />
            <Text style={ts.invoiceBannerText}>Invoice has been generated for this order.</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const ts = StyleSheet.create({
  screen: { flex:1,backgroundColor:'#F5F7FA' },
  center: { justifyContent:'center',alignItems:'center' },
  topNav: { backgroundColor:colors.red,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:14,...shadow },
  iconBtn: { width:38,height:38,borderRadius:19,backgroundColor:'rgba(255,255,255,0.2)',alignItems:'center',justifyContent:'center' },
  navTitle: { color:'#FFF',fontSize:18,fontWeight:'900' },
  content: { padding:16 },
  backBtn: { marginTop:20,backgroundColor:colors.red,borderRadius:10,paddingHorizontal:20,paddingVertical:10 },
  backBtnText: { color:'#FFF',fontWeight:'700' },
  headerCard: { backgroundColor:'#FFF',borderRadius:16,padding:16,marginBottom:12,...shadow },
  headerTop: { flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14 },
  orderId:   { fontSize:16,fontWeight:'900',color:'#212529' },
  orderDate: { fontSize:11,color:'#868E96',marginTop:3 },
  badge: { borderRadius:8,paddingHorizontal:10,paddingVertical:5 },
  badgeText: { fontSize:10,fontWeight:'800',textTransform:'uppercase' },
  headerMeta: { flexDirection:'row',gap:24 },
  metaItem: {},
  metaLabel: { fontSize:9,fontWeight:'800',color:'#ADB5BD',letterSpacing:0.8,marginBottom:3 },
  metaVal:   { fontSize:14,fontWeight:'800',color:'#212529' },
  terminalBanner: { flexDirection:'row',alignItems:'flex-start',borderRadius:12,borderLeftWidth:4,padding:14,marginBottom:12 },
  terminalTitle:  { fontSize:15,fontWeight:'900',marginBottom:4 },
  terminalNote:   { fontSize:13,color:'#666' },
  stepperCard: { backgroundColor:'#FFF',borderRadius:16,padding:16,marginBottom:12,...shadow },
  stepperTitle: { fontSize:15,fontWeight:'900',color:colors.text,marginBottom:16 },
  stageRow: { flexDirection:'row',marginBottom:0 },
  stageLeft: { alignItems:'center',width:28,marginRight:12 },
  stageDot: { width:22,height:22,borderRadius:11,backgroundColor:'#E0E0E0',alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:'#E0E0E0' },
  stageDotDone:    { backgroundColor:colors.red,borderColor:colors.red },
  stageDotCurrent: { backgroundColor:colors.red,borderColor:colors.red,transform:[{scale:1.15}] },
  stageDotInner: { width:8,height:8,borderRadius:4,backgroundColor:'#BDBDBD' },
  stageLine: { width:2,flex:1,backgroundColor:'#E0E0E0',minHeight:24,marginTop:2 },
  stageLineDone: { backgroundColor:colors.red },
  stageContent: { flex:1,paddingBottom:16 },
  stageLabel:   { fontSize:13,fontWeight:'700',color:'#9E9E9E' },
  stageLabelDone:    { color:colors.text,fontWeight:'700' },
  stageLabelCurrent: { color:colors.red,fontWeight:'900',fontSize:14 },
  stageLabelPending: { color:'#BDBDBD' },
  stageDate: { fontSize:10,color:colors.muted,marginTop:2 },
  stageNote: { fontSize:10,color:colors.muted,fontStyle:'italic',marginTop:1 },
  infoCard: { backgroundColor:'#FFF',borderRadius:14,padding:14,marginBottom:12,...shadow },
  infoCardTitle: { fontSize:14,fontWeight:'900',color:colors.text,marginBottom:10 },
  infoLine: { color:colors.text,fontSize:13,marginBottom:5 },
  itemsCard: { backgroundColor:'#FFF',borderRadius:14,padding:14,marginBottom:12,...shadow },
  itemRow: { flexDirection:'row',alignItems:'center',paddingVertical:8,borderBottomWidth:1,borderBottomColor:'#F5F5F5' },
  itemIcon: { width:34,height:34,borderRadius:8,backgroundColor:'rgba(198,40,40,0.08)',alignItems:'center',justifyContent:'center',marginRight:10 },
  itemName:  { fontSize:13,fontWeight:'700',color:colors.text },
  itemSku:   { fontSize:10,color:colors.muted,marginTop:2 },
  itemQty:   { fontSize:13,fontWeight:'700',color:colors.text },
  itemTotal: { fontSize:11,color:colors.red,marginTop:2 },
  invoiceBanner: { flexDirection:'row',alignItems:'center',gap:10,backgroundColor:'#E3F0FF',borderRadius:12,padding:14,marginBottom:12,borderWidth:1,borderColor:'#90CAF9' },
  invoiceBannerText: { flex:1,fontSize:13,color:'#1565C0',fontWeight:'600' },
});

export default TrackOrderPage;
