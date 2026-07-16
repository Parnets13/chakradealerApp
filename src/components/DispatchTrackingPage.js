/**
 * DispatchTrackingPage.js
 *
 * TWO MODES:
 *  1. ORDER TRACK MODE  — when `initialOrderId` is provided (from "My Orders → Track Order")
 *     Shows ONLY that specific order's full tracking card (no list, no filters).
 *  2. LIST MODE         — when opened from bottom nav "Track" tab (no initialOrderId)
 *     Shows all dispatches with filters, search, stats.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import dispatchService from './services/dispatchService';
import apiService from './services/apiService';

// ── Colors ────────────────────────────────────────────────────────────────────
const C = {
  red:    '#C51F2B',
  text:   '#212121',
  muted:  '#757575',
  orange: '#FF6F00',
  green:  '#1D9E75',
  blue:   '#1976D2',
  bg:     '#F5F5F5',
  white:  '#FFFFFF',
  border: '#E8E8E8',
};

const shadow = {
  shadowColor: '#000',
  shadowOpacity: 0.10,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 3,
};

// ── Status helpers ────────────────────────────────────────────────────────────
const ALL_STATUS_STYLES = {
  'Order Placed':       { color: '#1565C0', bg: '#E3F0FF' },
  'Pending Approval':   { color: '#B86A00', bg: '#FEF3E2' },
  'Approved':           { color: C.green,   bg: '#E8F5F0' },
  'Rejected':           { color: C.red,     bg: '#FFEBEE' },
  'Picking Started':    { color: '#6A1B9A', bg: '#F3E5F5' },
  'Picking Completed':  { color: '#6A1B9A', bg: '#EDE7F6' },
  'Sorting Started':    { color: '#1A7A6E', bg: '#E4F5F3' },
  'Sorting Completed':  { color: '#1A7A6E', bg: '#B2DFDB' },
  'Packing Started':    { color: '#0277BD', bg: '#E1F5FE' },
  'Packing Completed':  { color: '#0277BD', bg: '#B3E5FC' },
  'Invoice Generated':  { color: C.blue,    bg: '#E3F2FD' },
  'Ready for Dispatch': { color: '#558B2F', bg: '#F1F8E9' },
  'Dispatched':         { color: '#827717', bg: '#F9FBE7' },
  'In Transit':         { color: C.orange,  bg: '#FFF3E0' },
  'Delivered':          { color: C.green,   bg: '#E8F5F0' },
  'Cancelled':          { color: C.red,     bg: '#FFEBEE' },
  'Preparing':          { color: '#BA7517', bg: '#FFF8E1' },
  'Pending':            { color: '#BA7517', bg: '#FFF8E1' },
};

const getStatusStyle = s =>
  ALL_STATUS_STYLES[s] || { color: C.blue, bg: '#E3F2FD' };

const fmtDate = d => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return String(d); }
};

const fmtDateTime = d => {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return null; }
};

const numFmt = n => Number(n || 0).toLocaleString('en-IN');

// ── Stage icon helper ─────────────────────────────────────────────────────────
const stageIcon = stage => {
  if (stage === 'Order Placed')       return 'clipboard-check-outline';
  if (stage === 'Pending Approval')   return 'clock-outline';
  if (stage === 'Approved')           return 'check-decagram';
  if (stage.includes('Picking'))      return 'hand-pointing-right';
  if (stage.includes('Sorting'))      return 'sort-variant';
  if (stage.includes('Packing'))      return 'package-variant-closed';
  if (stage === 'Invoice Generated')  return 'file-document-outline';
  if (stage === 'Ready for Dispatch') return 'truck-check-outline';
  if (stage === 'Dispatched')         return 'truck-delivery';
  if (stage === 'In Transit')         return 'truck-fast';
  if (stage === 'Delivered')          return 'home-check';
  if (stage === 'Cancelled')          return 'close-circle';
  return 'circle-outline';
};

// ── Progress value from status ────────────────────────────────────────────────
const progressFromStatus = s => {
  if (!s) return 10;
  if (s === 'Delivered') return 100;
  if (s === 'Dispatched' || s === 'In Transit' || s === 'Ready for Dispatch') return 80;
  if (s === 'Approved' || s.includes('Packing') || s.includes('Sorting')
      || s.includes('Picking') || s === 'Invoice Generated') return 50;
  return 25;
};

// ── All pipeline stages ───────────────────────────────────────────────────────
const PIPELINE = [
  'Order Placed', 'Pending Approval', 'Approved',
  'Picking Started', 'Picking Completed',
  'Sorting Started', 'Sorting Completed',
  'Packing Started', 'Packing Completed',
  'Invoice Generated', 'Ready for Dispatch',
  'Dispatched', 'Delivered',
];

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
function DispatchTrackingPage({ onBack, initialOrderId, initialOrder }) {
  // If initialOrderId given → ORDER TRACK MODE (My Orders flow)
  // Otherwise              → LIST MODE (Nav Track tab)
  const isOrderMode = !!initialOrderId;

  return isOrderMode
    ? <OrderTrackMode  orderId={initialOrderId} orderData={initialOrder} onBack={onBack} />
    : <DispatchListMode onBack={onBack} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// MODE 1 — ORDER TRACK MODE (from "My Orders → Track Order")
// Shows a single order's full tracking card, scrollable
// ══════════════════════════════════════════════════════════════════════════════
function OrderTrackMode({ orderId, orderData, onBack }) {
  const [trackData,    setTrackData]    = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);

  const fetchTrack = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await apiService.get(`/orders/${orderId}/track`);
      if (res?.success && res?.data) {
        setTrackData(res.data);
        setLoading(false);
        return;
      }
    } catch (_) {}
    // fallback: dispatch endpoint
    try {
      const r2 = await dispatchService.trackDispatch(orderId);
      if (r2?.success) setTrackData(r2.data);
    } catch (__) {}
    setLoading(false);
    setRefreshing(false);
  }, [orderId]);

  useEffect(() => { fetchTrack(); }, [fetchTrack]);

  const onRefresh = () => { setRefreshing(true); fetchTrack(true); };

  // Resolve all data fields
  const items = (
    trackData?.lineItems?.length  ? trackData.lineItems  :
    trackData?.items?.length      ? trackData.items      :
    orderData?.lineItems?.length  ? orderData.lineItems  :
    orderData?.items?.length      ? orderData.items      : []
  );
  const item0        = items[0] || {};
  const product      = item0.name || item0.itemName || item0.productName
                       || orderData?.productName || orderData?._productName || null;
  const qty          = item0.quantity || item0.qty || null;
  const unit         = item0.packSize || item0.unit || item0.uom
                       || orderData?._packSize || null;
  const category     = item0.category || item0.categoryName
                       || orderData?._categoryName || orderData?.categoryName || null;
  const value        = trackData?.value || trackData?.totalValue || trackData?.totalAmount
                       || orderData?.value || orderData?.totalValue || orderData?.totalAmount || 0;
  const subTotal     = trackData?.subTotal || orderData?.subTotal || 0;
  const totalGst     = trackData?.totalGst || orderData?.totalGst || 0;
  const address      = trackData?.deliveryAddress || orderData?.deliveryAddress
                       || [orderData?.address, orderData?.city, orderData?.state, orderData?.pincode]
                          .filter(Boolean).join(', ') || null;
  const payMode      = trackData?.paymentMode || orderData?.paymentMode || null;
  const orderDate    = trackData?.orderDate   || orderData?.orderDate   || orderData?.createdAt || null;
  const expDelivery  = trackData?.expectedDelivery || orderData?.expectedDeliveryDate
                       || orderData?.expectedDelivery || null;
  const currentStatus= trackData?.status || orderData?.status || 'Order Placed';
  const courier      = trackData?.courier || trackData?.courierName || null;
  const awb          = trackData?.awbNumber || trackData?.awbLrNumber || trackData?.trackingNumber || null;
  const dispatchDate = trackData?.dispatchDate || null;
  const lastUpdate   = trackData?.lastUpdate || null;

  const stCfg      = getStatusStyle(currentStatus);
  const progressVal= progressFromStatus(currentStatus);

  // Build timeline stages
  const apiStages = trackData?.stages || [];
  const displayStages = apiStages.length > 0 ? apiStages : (() => {
    const curIdx = PIPELINE.indexOf(currentStatus);
    return PIPELINE.map((stage, i) => ({
      stage,
      completed: i < curIdx,
      active:    i === curIdx,
      pending:   i > curIdx,
    }));
  })();

  return (
    <View style={styles.screen}>
      {/* Top Nav */}
      <View style={styles.topNav}>
        <Pressable onPress={onBack} style={styles.navBack}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </Pressable>
        <View style={styles.navCenter}>
          <Icon name="map-marker-path" size={22} color="#FFF" />
          <Text style={styles.navTitle}>Track Order</Text>
        </View>
        <Pressable style={styles.navBack} onPress={() => fetchTrack()}>
          <Icon name="refresh" size={22} color="#FFF" />
        </Pressable>
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 14, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.red]} tintColor={C.red} />
        }
      >
        {/* ── ORDER ID + STATUS header card ── */}
        <View style={tStyles.card}>

          {/* Row: orderId + status badge */}
          <View style={tStyles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={tStyles.orderId}>{orderId}</Text>
              <Text style={tStyles.productLine} numberOfLines={2}>
                {product || (items.length > 1 ? `${items.length} items` : 'Order')}
                {qty   ? ` · ${qty}${unit ? ' ' + unit : ''}` : ''}
                {category ? `  [${category}]` : ''}
                {value > 0 ? `  ·  ₹${numFmt(value)}` : ''}
              </Text>
            </View>
            <View style={[tStyles.statusBadge, { backgroundColor: stCfg.bg }]}>
              <Text style={[tStyles.statusTxt, { color: stCfg.color }]}>{currentStatus}</Text>
            </View>
          </View>

          {/* ── 4-step progress tracker ── */}
          <View style={tStyles.progressWrap}>
            <View style={tStyles.stepsRow}>
              {/* Confirmed */}
              <View style={[tStyles.stepDot, tStyles.stepDone]}>
                <Icon name="check" size={14} color="#FFF" />
              </View>
              <View style={[tStyles.stepLine, progressVal >= 50 && tStyles.stepLineDone]} />
              {/* Packed */}
              <View style={[tStyles.stepDot, progressVal >= 50 ? tStyles.stepDone : tStyles.stepPending]}>
                {progressVal >= 50 ? <Icon name="check" size={14} color="#FFF" /> : null}
              </View>
              <View style={[tStyles.stepLine, progressVal >= 80 && tStyles.stepLineDone]} />
              {/* Dispatched */}
              <View style={[
                tStyles.stepDot,
                progressVal >= 80 && progressVal < 100 ? tStyles.stepActive
                : progressVal === 100 ? tStyles.stepDone : tStyles.stepPending,
              ]}>
                <Icon name="truck-delivery" size={13} color="#FFF" />
              </View>
              <View style={[tStyles.stepLine, progressVal === 100 && tStyles.stepLineDone]} />
              {/* Delivered */}
              <View style={[tStyles.stepDot, progressVal === 100 ? tStyles.stepDone : tStyles.stepPending]}>
                <Icon name="home" size={13} color="#FFF" />
              </View>
            </View>
            <View style={tStyles.labelsRow}>
              <Text style={tStyles.stepLbl}>Confirmed</Text>
              <Text style={tStyles.stepLbl}>Packed</Text>
              <Text style={[tStyles.stepLbl, progressVal >= 80 && tStyles.stepLblActive]}>Dispatched</Text>
              <Text style={tStyles.stepLbl}>Delivered</Text>
            </View>
            <View style={tStyles.pBarBg}>
              <View style={[tStyles.pBarFill, { width: `${progressVal}%` }]} />
            </View>
          </View>

          {/* Expected delivery */}
          {(expDelivery || orderDate) && (
            <Text style={tStyles.expectedTxt}>
              {expDelivery
                ? <>Expected delivery: <Text style={tStyles.expectedBold}>{fmtDate(expDelivery)}</Text></>
                : <>Order date: <Text style={tStyles.expectedBold}>{fmtDate(orderDate)}</Text></>}
            </Text>
          )}

          {/* Courier row */}
          {courier ? (
            <View style={tStyles.courierRow}>
              <View style={tStyles.courierIcon}>
                <Icon name="truck-delivery" size={20} color={C.red} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={tStyles.courierName}>{courier}{awb ? `  ·  AWB: ${awb}` : ''}</Text>
                {lastUpdate
                  ? <Text style={tStyles.courierSub}>{lastUpdate}</Text>
                  : dispatchDate
                  ? <Text style={tStyles.courierSub}>Dispatched: {fmtDate(dispatchDate)}</Text>
                  : null}
              </View>
            </View>
          ) : (
            <View style={[tStyles.courierRow, { backgroundColor: '#F5F5F5' }]}>
              <View style={[tStyles.courierIcon, { backgroundColor: '#EEEEEE' }]}>
                <Icon name="clock-outline" size={20} color={C.muted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={tStyles.courierName}>Logistics not yet assigned</Text>
                <Text style={tStyles.courierSub}>Status: {currentStatus}</Text>
              </View>
            </View>
          )}
        </View>

        {/* ── ORDER INFO CARD ── */}
        {(product || value > 0 || items.length > 0) && (
          <View style={tStyles.card}>
            <Text style={tStyles.sectionTitle}>
              <Icon name="package-variant" size={13} color={C.red} /> Order Info
            </Text>
            {items.length > 1
              ? items.map((it, idx) => {
                  const itName  = it.name || it.itemName || it.productName || `Item ${idx + 1}`;
                  const itQty   = it.quantity || it.qty || '';
                  const itUnit  = it.packSize || it.unit || it.uom || '';
                  const itTotal = it.total || it.totalAmount
                                  || (it.quantity && it.unitPrice ? it.quantity * it.unitPrice : 0);
                  return (
                    <View key={idx} style={tStyles.detailRow}>
                      <Text style={[tStyles.detailLbl, { flex: 2 }]} numberOfLines={2}>{itName}</Text>
                      <Text style={tStyles.detailVal}>
                        {itQty ? `${itQty}${itUnit ? ' ' + itUnit : ''}` : '—'}
                        {itTotal > 0 ? `  ₹${numFmt(itTotal)}` : ''}
                      </Text>
                    </View>
                  );
                })
              : <>
                  {product   && <View style={tStyles.detailRow}><Text style={tStyles.detailLbl}>Product</Text><Text style={[tStyles.detailVal, { maxWidth: '60%' }]} numberOfLines={2}>{product}</Text></View>}
                  {category  && <View style={tStyles.detailRow}><Text style={tStyles.detailLbl}>Category</Text><Text style={tStyles.detailVal}>{category}</Text></View>}
                  {qty       && <View style={tStyles.detailRow}><Text style={tStyles.detailLbl}>Quantity</Text><Text style={tStyles.detailVal}>{qty}{unit ? ' ' + unit : ''}</Text></View>}
                </>
            }
            {payMode    && <View style={tStyles.detailRow}><Text style={tStyles.detailLbl}>Payment</Text><Text style={tStyles.detailVal}>{payMode}</Text></View>}
            {address    && <View style={tStyles.detailRow}><Text style={tStyles.detailLbl}>Address</Text><Text style={[tStyles.detailVal, { maxWidth: '65%' }]} numberOfLines={3}>{address}</Text></View>}
            {orderDate  && <View style={tStyles.detailRow}><Text style={tStyles.detailLbl}>Order Date</Text><Text style={tStyles.detailVal}>{fmtDate(orderDate)}</Text></View>}
            {subTotal > 0 && <View style={tStyles.detailRow}><Text style={tStyles.detailLbl}>Sub Total</Text><Text style={tStyles.detailVal}>₹{numFmt(subTotal)}</Text></View>}
            {totalGst > 0 && <View style={tStyles.detailRow}><Text style={tStyles.detailLbl}>GST</Text><Text style={tStyles.detailVal}>₹{numFmt(totalGst)}</Text></View>}
            {value > 0    && (
              <View style={[tStyles.detailRow, { borderBottomWidth: 0 }]}>
                <Text style={[tStyles.detailLbl, { color: C.red, fontWeight: '800' }]}>Grand Total</Text>
                <Text style={[tStyles.detailVal, { color: C.red, fontSize: 15, fontWeight: '900' }]}>₹{numFmt(value)}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── ORDER TIMELINE CARD ── */}
        <View style={tStyles.card}>
          <Text style={tStyles.sectionTitle}>
            <Icon name="timeline-clock-outline" size={13} color={C.red} /> Order Timeline
          </Text>
          {loading ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={C.red} />
              <Text style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>Loading tracking…</Text>
            </View>
          ) : (
            <View style={{ paddingLeft: 4, paddingTop: 4 }}>
              {displayStages.map((step, i) => {
                const isDone   = step.completed || false;
                const isActive = step.active    || false;
                const isPend   = !isDone && !isActive;
                const isLast   = i === displayStages.length - 1;
                const dotColor = isDone ? C.green : isActive ? C.red : '#DDD';
                const lineColor= isDone ? C.green : '#E0E0E0';
                return (
                  <View key={i} style={{ flexDirection: 'row', marginBottom: 0 }}>
                    {/* Dot + line column */}
                    <View style={{ width: 28, alignItems: 'center' }}>
                      <View style={{
                        width: 22, height: 22, borderRadius: 11,
                        backgroundColor: dotColor,
                        alignItems: 'center', justifyContent: 'center', zIndex: 2,
                      }}>
                        {(isDone || isActive) && (
                          <Icon name={stageIcon(step.stage)} size={11} color="#FFF" />
                        )}
                      </View>
                      {!isLast && (
                        <View style={{ width: 2, flex: 1, minHeight: 20, backgroundColor: lineColor, marginVertical: 2 }} />
                      )}
                    </View>
                    {/* Content */}
                    <View style={{ flex: 1, paddingLeft: 10, paddingBottom: 14 }}>
                      <Text style={[
                        { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 2 },
                        isActive && { color: C.red, fontWeight: '900' },
                        isPend   && { color: '#BDBDBD' },
                        isDone   && { fontWeight: '700' },
                      ]}>
                        {step.stage}
                      </Text>
                      {step.at
                        ? <Text style={{ fontSize: 11, color: C.muted }}>{fmtDateTime(step.at)}{step.note ? `  ·  ${step.note}` : ''}</Text>
                        : isActive
                        ? <Text style={{ fontSize: 11, color: C.red, fontWeight: '700' }}>Current Status</Text>
                        : isPend
                        ? <Text style={{ fontSize: 11, color: '#BDBDBD' }}>Awaited</Text>
                        : null}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODE 2 — DISPATCH LIST MODE (from Nav "Track" tab)
// Shows all dispatches with stats + filters + search
// ══════════════════════════════════════════════════════════════════════════════

// ── Normalize raw backend dispatch/order data into a consistent shape ─────────
const normalizeShipment = (raw) => {
  // Support both DocketTracking (from /dispatch) and SalesOrder (from /orders)
  const orderDetails = raw.orderDetails || {};

  // Order ID — prefer readable orderId
  const orderId =
    raw.orderId || raw.docketId || orderDetails.orderId ||
    raw.invoiceNo || raw._id || '—';

  // Status — normalize transportStatus or order status
  const transportMap = {
    pickup_pending: 'Pending',
    picked_up:      'Preparing',
    in_transit:     'In Transit',
    reached_hub:    'In Transit',
    out_for_delivery: 'In Transit',
    delivered:      'Delivered',
  };
  const rawStatus = raw.transportStatus || raw.status || raw.dispatchStatus || '';
  const status = transportMap[rawStatus] || rawStatus || 'Pending';

  // Progress
  const progressMap = {
    pickup_pending:    10,
    picked_up:         25,
    in_transit:        60,
    reached_hub:       75,
    out_for_delivery:  90,
    delivered:         100,
  };
  const progress = raw.progress ??
    progressMap[raw.transportStatus] ??
    progressFromStatus(status);

  // Product preview from lineItems
  const lineItems = orderDetails.lineItems || raw.lineItems || raw.items || [];
  const firstItem = lineItems[0] || {};
  const productPreview =
    raw.productPreview ||
    firstItem.name || firstItem.itemName || firstItem.productName ||
    raw.productName || raw.itemDescription ||
    (lineItems.length > 1 ? `${lineItems.length} items` : null) ||
    '—';

  const totalUnits =
    raw.totalUnits ||
    lineItems.reduce((s, i) => s + (Number(i.quantity || i.qty) || 0), 0) ||
    null;

  const amount =
    raw.amount ||
    (Number(orderDetails.value) > 0 ? `₹${numFmt(orderDetails.value)}` : null) ||
    (Number(raw.value)          > 0 ? `₹${numFmt(raw.value)}`          : null) ||
    (Number(raw.totalAmount)    > 0 ? `₹${numFmt(raw.totalAmount)}`    : null) ||
    null;

  // Courier / logistics
  const courier      = raw.courier || raw.courierName || raw.courierPartner || null;
  const awbLrNumber  = raw.awbLrNumber || raw.awbNumber || raw.lrNumber || raw.docketId || null;
  const vehicleNumber= raw.vehicleNumber || null;
  const dispatchDate = raw.dispatchDate || raw.pickupDate || raw.createdAt || null;

  const orderDate       = raw.orderDate || orderDetails.createdAt || raw.createdAt || null;
  const expectedDelivery= raw.expectedDelivery || raw.expectedDeliveryDate || null;

  // Stages for timeline — from statusHistory (SalesOrder) or trackingHistory (DocketTracking)
  const historySource = raw.statusHistory || raw.trackingHistory || [];
  const stages = raw.stages ||
    (historySource.length
      ? historySource.map(h => ({
          stage:     h.status || h.stage || h.description || '—',
          at:        h.at || h.timestamp || h.date || h.time || null,
          note:      h.note || h.description || '',
          completed: true,
          active:    false,
        }))
      : null);

  return {
    // ids
    mongodbId: raw._id || raw.mongodbId,
    orderId,
    // display
    productPreview,
    totalUnits: totalUnits || undefined,
    amount,
    dispatchStatus: status,
    status,
    progress,
    // logistics
    courier,
    awbLrNumber,
    vehicleNumber,
    dispatchDate,
    orderDate,
    expectedDelivery,
    // timeline
    stages,
    lineItems,
    // raw (for expanded view)
    _raw: raw,
  };
};
function DispatchListMode({ onBack }) {
  const [activeFilter, setActiveFilter] = useState('All Orders');
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');
  const [shipments, setShipments]       = useState([]);
  const [stats, setStats]               = useState({ total: 0, inTransit: 0, delivered: 0, preparing: 0 });
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);

  const filters = ['All Orders', 'In Transit', 'Delivered', 'Pending', 'Preparing'];

  // Map UI filter chip → API status param for /orders endpoint
  const filterToStatus = {
    'All Orders':  undefined,
    'In Transit':  'In Transit',
    'Delivered':   'Delivered',
    'Pending':     'Pending Approval',
    'Preparing':   'Approved',   // Approved / picking / packing stage = "Preparing"
  };

  const fetchDispatches = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Fetch from /orders (SalesOrder) so ALL dealer orders are visible,
      // not just the ones that have a DocketTracking entry.
      const statusParam = filterToStatus[activeFilter];
      const res = await apiService.get('/orders', {
        ...(statusParam && { status: statusParam }),
        ...(searchQuery.trim() && { search: searchQuery.trim() }),
        limit: 100,
      });
      if (res?.success) {
        const raw = res.data || [];
        // Normalize every item to a consistent shape for ShipmentCard
        const normalized = raw.map(normalizeShipment);
        setShipments(normalized);
        // Compute stats from normalized data
        setStats({
          total:     normalized.length,
          inTransit: normalized.filter(s =>
            ['In Transit', 'Dispatched', 'Ready for Dispatch'].includes(s.status)).length,
          delivered: normalized.filter(s => s.status === 'Delivered').length,
          preparing: normalized.filter(s =>
            ['Order Placed', 'Pending Approval', 'Approved',
              'Picking Started', 'Picking Completed',
              'Sorting Started', 'Sorting Completed',
              'Packing Started', 'Packing Completed',
              'Invoice Generated', 'Pending', 'Preparing'].includes(s.status)).length,
        });
      } else {
        Alert.alert('Error', res?.message || 'Failed to load orders');
      }
    } catch (err) {
      Alert.alert('Connection Error', err?.message || 'Could not reach server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter, searchQuery]);

  useEffect(() => { fetchDispatches(); }, [fetchDispatches]);

  const onRefresh = () => { setRefreshing(true); fetchDispatches(true); };

  const statCards = [
    { label: 'Total',      value: stats.total     || shipments.length, color: C.text   },
    { label: 'In Transit', value: stats.inTransit  || 0,               color: C.orange },
    { label: 'Delivered',  value: stats.delivered  || 0,               color: C.green  },
    { label: 'Preparing',  value: stats.preparing  || 0,               color: C.blue   },
  ];

  return (
    <View style={styles.screen}>
      {/* Top Nav */}
      <View style={styles.topNav}>
        <Pressable onPress={onBack} style={styles.navBack}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </Pressable>
        <View style={styles.navCenter}>
          <Icon name="truck-delivery" size={22} color="#FFF" />
          <Text style={styles.navTitle}>Dispatch & Tracking</Text>
        </View>
        <Pressable style={styles.navBack} onPress={() => setSearchVisible(v => !v)}>
          <Icon name="magnify" size={24} color="#FFF" />
        </Pressable>
      </View>

      {/* Search bar */}
      {searchVisible && (
        <View style={styles.searchBar}>
          <Icon name="magnify" size={20} color={C.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by Order ID, Product…"
            placeholderTextColor={C.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => fetchDispatches()}
            returnKeyType="search"
            autoFocus
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={20} color={C.muted} />
            </Pressable>
          )}
        </View>
      )}

      {/* Stats row */}
      <View style={styles.statsRow}>
        {statCards.map(s => (
          <View key={s.label} style={styles.statCard}>
            <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLbl}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Filter chips */}
      <View style={styles.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {filters.map(f => (
            <Pressable key={f} onPress={() => setActiveFilter(f)}
              style={[styles.chip, activeFilter === f && styles.chipActive]}>
              <Text style={[styles.chipTxt, activeFilter === f && styles.chipTxtActive]}>{f}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.red} />
          <Text style={styles.centerTxt}>Loading dispatches…</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 14, paddingBottom: 60 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.red]} tintColor={C.red} />}
        >
          {shipments.length === 0 ? (
            <View style={styles.center}>
              <Icon name="truck-outline" size={64} color={C.muted} />
              <Text style={styles.emptyTitle}>No Dispatches Found</Text>
              <Text style={styles.emptyTxt}>{activeFilter !== 'All Orders' ? `No "${activeFilter}" orders` : 'No dispatch orders yet'}</Text>
            </View>
          ) : (
            shipments.map(s => (
              <ShipmentCard
                key={s.mongodbId || s.orderId}
                shipment={s}
                showDeliveredUI={activeFilter === 'Delivered'}
              />
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

// ── Rating config ─────────────────────────────────────────────────────────────
const RATING_LABELS = ['Very Bad', 'Bad', 'Ok-Ok', 'Good', 'Very Good'];
const RATING_COLORS = ['#EF4444', '#F97316', '#F59E0B', '#22C55E', '#10B981'];
const RATING_ICONS  = ['emoticon-angry-outline', 'emoticon-sad-outline', 'emoticon-neutral-outline', 'emoticon-happy-outline', 'emoticon-excited-outline'];
let AsyncStorage;
try { AsyncStorage = require('@react-native-async-storage/async-storage').default; } catch (_) {}
const getRatingKey = (id) => `@order_rating_${id}`;

// ══════════════════════════════════════════════════════════════════════════════
// SHIPMENT CARD — used in List Mode
// ══════════════════════════════════════════════════════════════════════════════
function ShipmentCard({ shipment, showDeliveredUI = false }) {
  const [expanded, setExpanded]               = useState(false);
  const [trackDetail, setTrackDetail]         = useState(null);
  const [loadingDetail, setLoadingDetail]     = useState(false);
  const [rating, setRating]                   = useState(null);
  const [showRating, setShowRating]           = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  // Show delivered banner + rating ONLY when in the Delivered filter tab
  const isDelivered = showDeliveredUI && shipment.status === 'Delivered';
  const st = getStatusStyle(shipment.dispatchStatus || shipment.status);

  useEffect(() => {
    if (!isDelivered) return;
    const key = getRatingKey(shipment.orderId || shipment.mongodbId);
    AsyncStorage?.getItem(key).then(v => {
      if (v !== null) { setRating(Number(v)); setRatingSubmitted(true); }
    }).catch(() => {});
  }, [shipment.orderId, isDelivered]);

  const fetchTrackDetail = async () => {
    if (trackDetail) return;
    if (shipment.stages?.length) {
      setTrackDetail({ stages: shipment.stages, items: shipment.lineItems });
      return;
    }
    setLoadingDetail(true);
    try {
      const res = await apiService.get(`/orders/${shipment.mongodbId || shipment.orderId}/track`);
      if (res?.success && res?.data) { setTrackDetail(res.data); setLoadingDetail(false); return; }
    } catch (_) {}
    try {
      const res = await dispatchService.trackDispatch(shipment.mongodbId || shipment.orderId);
      if (res?.success) setTrackDetail(res.data);
    } catch (_) {}
    setLoadingDetail(false);
  };

  const handleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) fetchTrackDetail();
  };

  const handleRating = async (idx) => {
    setRating(idx);
    setRatingSubmitted(true);
    setShowRating(false);
    try { await AsyncStorage?.setItem(getRatingKey(shipment.orderId || shipment.mongodbId), String(idx)); } catch (_) {}
  };

  const stages = trackDetail?.stages || null;

  // Delivery date from statusHistory or stages
  const deliveryEntry =
    trackDetail?.stages?.find(s => s.stage === 'Delivered' && s.at) ||
    shipment._raw?.statusHistory?.find(h => h.status === 'Delivered') || null;
  const deliveredDate = deliveryEntry?.at || deliveryEntry?.date || null;

  let daysEarlyTxt = null;
  if (deliveredDate && shipment.expectedDelivery) {
    const diff = Math.round((new Date(shipment.expectedDelivery) - new Date(deliveredDate)) / 86400000);
    if (diff > 0)      daysEarlyTxt = `${diff} day${diff > 1 ? 's' : ''} earlier than expected`;
    else if (diff < 0) daysEarlyTxt = `${Math.abs(diff)} day${Math.abs(diff) > 1 ? 's' : ''} later than expected`;
    else               daysEarlyTxt = 'Delivered on time';
  }

  return (
    <View style={scStyles.card}>

      {/* ── DELIVERED BANNER ── */}
      {isDelivered && (
        <View style={scStyles.deliveredBanner}>
          <View style={scStyles.deliveredIconWrap}>
            <Icon name="check-circle" size={26} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={scStyles.deliveredTitle}>🎉 Your order was delivered!</Text>
            {deliveredDate ? (
              <Text style={scStyles.deliveredDate}>
                {fmtDate(deliveredDate)}
                {daysEarlyTxt ? (
                  <Text style={[
                    scStyles.deliveredEarly,
                    daysEarlyTxt.includes('earlier') ? { color: '#86EFAC' } :
                    daysEarlyTxt.includes('on time') ? { color: '#BEF264' } :
                    { color: '#FCA5A5' },
                  ]}>{`  ·  ${daysEarlyTxt}`}</Text>
                ) : null}
              </Text>
            ) : null}
          </View>
          <Pressable
            style={[scStyles.rateNowBtn, ratingSubmitted && { backgroundColor: RATING_COLORS[rating] + '33', borderColor: RATING_COLORS[rating] }]}
            onPress={() => setShowRating(v => !v)}
          >
            <Icon name={ratingSubmitted ? 'star' : 'star-outline'} size={13} color={ratingSubmitted ? RATING_COLORS[rating] : '#FFF'} />
            <Text style={[scStyles.rateNowTxt, ratingSubmitted && { color: RATING_COLORS[rating] }]}>
              {ratingSubmitted ? RATING_LABELS[rating] : 'Rate'}
            </Text>
          </Pressable>
        </View>
      )}

      {/* ── RATING PANEL ── */}
      {isDelivered && showRating && (
        <View style={scStyles.ratingPanel}>
          <Text style={scStyles.ratingTitle}>Rate this Order</Text>
          <Text style={scStyles.ratingSubtitle}>How was your experience?</Text>
          <View style={scStyles.starsRow}>
            {RATING_LABELS.map((lbl, idx) => {
              const sel = rating === idx;
              return (
                <Pressable key={idx} style={scStyles.starItem} onPress={() => handleRating(idx)}>
                  <View style={[scStyles.starIconWrap, sel && { backgroundColor: RATING_COLORS[idx] + '22', borderColor: RATING_COLORS[idx] }]}>
                    <Icon
                      name={sel ? RATING_ICONS[idx].replace('-outline','') : RATING_ICONS[idx]}
                      size={28} color={sel ? RATING_COLORS[idx] : '#BDBDBD'}
                    />
                    <View style={scStyles.miniStarsRow}>
                      {Array.from({ length: idx + 1 }).map((_, si) => (
                        <Icon key={si} name="star" size={6} color={sel ? RATING_COLORS[idx] : '#E0E0E0'} />
                      ))}
                    </View>
                  </View>
                  <Text style={[scStyles.starLbl, sel && { color: RATING_COLORS[idx], fontWeight: '900' }]}>{lbl}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Header */}
      <View style={scStyles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text style={scStyles.orderId}>{shipment.orderId || '—'}</Text>
          <View style={[scStyles.badge, { backgroundColor: st.bg }]}>
            <Text style={[scStyles.badgeTxt, { color: st.color }]}>{shipment.dispatchStatus || shipment.status || 'Unknown'}</Text>
          </View>
        </View>
        <Text style={scStyles.details} numberOfLines={1}>
          {shipment.productPreview}
          {shipment.totalUnits ? ` · ${shipment.totalUnits} units` : ''}
          {shipment.amount     ? ` · ${shipment.amount}` : ''}
        </Text>

        {/* Progress steps */}
        <View style={scStyles.stepsRow}>
          <View style={[scStyles.stepDot, scStyles.stepDone]}><Icon name="check" size={12} color="#FFF" /></View>
          <View style={[scStyles.stepLine, (shipment.progress || 0) >= 50 && scStyles.stepLineDone]} />
          <View style={[scStyles.stepDot, (shipment.progress || 0) >= 50 ? scStyles.stepDone : scStyles.stepPend]}><Icon name="check" size={12} color="#FFF" /></View>
          <View style={[scStyles.stepLine, (shipment.progress || 0) >= 80 && scStyles.stepLineDone]} />
          <View style={[scStyles.stepDot,
            (shipment.progress || 0) >= 80 && (shipment.progress || 0) < 100 ? scStyles.stepActive
            : (shipment.progress || 0) === 100 ? scStyles.stepDone : scStyles.stepPend
          ]}><Icon name="truck-delivery" size={12} color="#FFF" /></View>
          <View style={[scStyles.stepLine, (shipment.progress || 0) === 100 && scStyles.stepLineDone]} />
          <View style={[scStyles.stepDot, (shipment.progress || 0) === 100 ? scStyles.stepDone : scStyles.stepPend]}>
            <Icon name="home" size={12} color="#FFF" />
          </View>
        </View>
        <View style={scStyles.labelsRow}>
          {['Confirmed','Packed','Dispatched','Delivered'].map(l => (
            <Text key={l} style={scStyles.stepLbl}>{l}</Text>
          ))}
        </View>
        <View style={scStyles.pBarBg}>
          <View style={[scStyles.pBarFill, { width: `${shipment.progress || 0}%` }]} />
        </View>

        <Text style={scStyles.datesTxt}>
          {'Order: '}
          <Text style={{ fontWeight: '800', color: C.text }}>{fmtDate(shipment.orderDate)}</Text>
          {shipment.expectedDelivery ? `  ·  Expected: ${fmtDate(shipment.expectedDelivery)}` : ''}
        </Text>
      </View>

      {/* Courier section */}
      {shipment.courier ? (
        <View style={[scStyles.courierRow, isDelivered && { backgroundColor: '#F0FDF4' }]}>
          <View style={[scStyles.courierIcon, isDelivered && { backgroundColor: '#DCFCE7' }]}>
            <Icon name={isDelivered ? 'home-check' : 'truck-delivery'} size={22} color={isDelivered ? C.green : C.red} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={scStyles.courierName}>{shipment.courier}{shipment.awbLrNumber ? `  ·  LR/AWB: ${shipment.awbLrNumber}` : ''}</Text>
            <Text style={scStyles.courierSub}>{shipment.vehicleNumber ? `Vehicle: ${shipment.vehicleNumber}` : shipment.dispatchDate ? `Dispatched: ${fmtDate(shipment.dispatchDate)}` : 'Dispatch info pending'}</Text>
          </View>
          {!isDelivered && (
            <View style={scStyles.activeBadge}><Icon name="map-marker-check" size={13} color={C.red} /><Text style={scStyles.activeTxt}>Active</Text></View>
          )}
        </View>
      ) : (
        <View style={[scStyles.courierRow, isDelivered && { backgroundColor: '#F0FDF4' }]}>
          <View style={[scStyles.courierIcon, { backgroundColor: isDelivered ? '#DCFCE7' : '#F0F0F0' }]}>
            <Icon name={
              isDelivered ? 'home-check' :
              ['In Transit'].includes(shipment.status) ? 'truck-fast' :
              ['Ready for Dispatch','Dispatched'].includes(shipment.status) ? 'truck-delivery' :
              'clock-outline'
            } size={22} color={
              isDelivered ? C.green :
              ['In Transit','Dispatched','Ready for Dispatch'].includes(shipment.status) ? C.orange : C.muted
            } />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[scStyles.courierName, isDelivered && { color: C.green }]}>
              {isDelivered ? 'Order Successfully Delivered'
                : ['In Transit','Dispatched'].includes(shipment.status) ? 'In Transit — Logistics not assigned'
                : 'Logistics not yet assigned'}
            </Text>
            <Text style={scStyles.courierSub}>
              {isDelivered && deliveredDate
                ? `Delivered on ${fmtDate(deliveredDate)}`
                : `Status: ${shipment.status || 'Pending'}${shipment.dispatchDate ? `  ·  ${fmtDate(shipment.dispatchDate)}` : ''}`}
            </Text>
          </View>
        </View>
      )}

      {/* Expanded timeline */}
      {expanded && (
        <View style={scStyles.timelineWrap}>
          <Text style={scStyles.tlTitle}>Order Timeline</Text>
          {loadingDetail ? (
            <View style={{ padding: 16, alignItems: 'center' }}><ActivityIndicator size="small" color={C.red} /></View>
          ) : stages && stages.length > 0 ? (
            <View style={{ paddingLeft: 8 }}>
              {stages.map((step, i) => (
                <View key={i} style={{ flexDirection: 'row', marginBottom: 4 }}>
                  <View style={{ width: 20, alignItems: 'center' }}>
                    <View style={[scStyles.tlDot,
                      step.completed && scStyles.tlDotDone,
                      step.active    && scStyles.tlDotActive,
                    ]} />
                    {i < stages.length - 1 && (
                      <View style={[scStyles.tlLine, step.completed && scStyles.tlLineDone]} />
                    )}
                  </View>
                  <View style={{ flex: 1, paddingLeft: 10, paddingBottom: 14 }}>
                    <Text style={[
                      scStyles.tlLabel,
                      step.active  && scStyles.tlLabelActive,
                      step.pending && scStyles.tlLabelPend,
                    ]}>{step.stage}</Text>
                    {step.at
                      ? <Text style={scStyles.tlTime}>{fmtDateTime(step.at)}{step.note ? `  ·  ${step.note}` : ''}</Text>
                      : step.pending ? <Text style={scStyles.tlTime}>Awaited</Text>
                      : step.active  ? <Text style={[scStyles.tlTime, { color: C.red, fontWeight: '700' }]}>Current Status</Text>
                      : null}
                  </View>
                </View>
              ))}
            </View>
          ) : (() => {
            // Build pipeline from current status when no stages available
            const curStatus = shipment.status || shipment.dispatchStatus || 'Pending';
            const curIdx = PIPELINE.indexOf(curStatus);
            const pipeStages = PIPELINE.map((stage, i) => ({
              stage,
              completed: i < (curIdx >= 0 ? curIdx : 0),
              active:    i === (curIdx >= 0 ? curIdx : 0),
              pending:   i > (curIdx >= 0 ? curIdx : 0),
            }));
            return (
              <View style={{ paddingLeft: 8 }}>
                {pipeStages.map((step, i) => (
                  <View key={i} style={{ flexDirection: 'row', marginBottom: 4 }}>
                    <View style={{ width: 20, alignItems: 'center' }}>
                      <View style={[scStyles.tlDot,
                        step.completed && scStyles.tlDotDone,
                        step.active    && scStyles.tlDotActive,
                      ]} />
                      {i < pipeStages.length - 1 && (
                        <View style={[scStyles.tlLine, step.completed && scStyles.tlLineDone]} />
                      )}
                    </View>
                    <View style={{ flex: 1, paddingLeft: 10, paddingBottom: 14 }}>
                      <Text style={[
                        scStyles.tlLabel,
                        step.active  && scStyles.tlLabelActive,
                        step.pending && scStyles.tlLabelPend,
                      ]}>{step.stage}</Text>
                      {step.active
                        ? <Text style={[scStyles.tlTime, { color: C.red, fontWeight: '700' }]}>Current Status</Text>
                        : step.pending
                        ? <Text style={scStyles.tlTime}>Awaited</Text>
                        : <Text style={scStyles.tlTime}>Completed</Text>}
                    </View>
                  </View>
                ))}
              </View>
            );
          })()}

          {/* Items */}
          {(trackDetail?.items?.length || shipment.lineItems?.length) > 0 && (
            <View style={scStyles.itemsBox}>
              <Text style={scStyles.itemsTitle}>Items in this Order</Text>
              {(trackDetail?.items || shipment.lineItems || []).map((item, i) => (
                <View key={i} style={scStyles.itemRow}>
                  <Icon name="package-variant-closed" size={12} color={C.muted} />
                  <Text style={scStyles.itemName} numberOfLines={1}>
                    {item.name || item.itemName || item.productName || `Item ${i + 1}`}
                  </Text>
                  <Text style={scStyles.itemQty}>×{item.quantity || item.qty || '—'}</Text>
                  {(item.total || (item.quantity && item.unitPrice)) > 0 && (
                    <Text style={scStyles.itemPrice}>₹{numFmt(item.total || item.quantity * item.unitPrice)}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Call driver — only if not delivered */}
          {!isDelivered && (
            <Pressable style={scStyles.callBtn} onPress={() =>
              Alert.alert('Call Driver', `Call driver for ${shipment.courier || 'courier'}?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Call', onPress: () => Linking.openURL('tel:+919876543210') },
              ])
            }>
              <Icon name="phone" size={18} color={C.red} />
              <Text style={scStyles.callTxt}>Call Driver</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* ── BOTTOM ACTION ROW ── */}
      <View style={scStyles.bottomRow}>
        <Pressable style={scStyles.viewBtn} onPress={handleExpand}>
          <Icon name={expanded ? 'chevron-up' : 'file-document-outline'} size={16} color={C.red} />
          <Text style={scStyles.viewBtnTxt}>{expanded ? 'Show Less' : 'View Details'}</Text>
        </Pressable>
        {isDelivered && (
          <Pressable
            style={[scStyles.rateBtn, ratingSubmitted && { backgroundColor: RATING_COLORS[rating] + '18', borderColor: RATING_COLORS[rating] }]}
            onPress={() => setShowRating(v => !v)}
          >
            <Icon name={ratingSubmitted ? 'star' : 'star-outline'} size={15}
              color={ratingSubmitted ? RATING_COLORS[rating] : C.red} />
            <Text style={[scStyles.rateBtnTxt, ratingSubmitted && { color: RATING_COLORS[rating] }]}>
              {ratingSubmitted ? RATING_LABELS[rating] : 'Rate Order'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════════════════════

// Shared screen + nav styles
const styles = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: C.bg },
  topNav:      { backgroundColor: C.red, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...shadow },
  navBack:     { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  navCenter:   { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'center' },
  navTitle:    { color: '#FFF', fontSize: 19, fontWeight: '900' },

  searchBar:   { backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  searchInput: { flex: 1, fontSize: 15, color: C.text, padding: 0 },

  statsRow:    { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 14, backgroundColor: C.bg },
  statCard:    { flex: 1, backgroundColor: C.white, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center', ...shadow },
  statVal:     { fontSize: 24, fontWeight: '900', marginBottom: 4 },
  statLbl:     { fontSize: 10, color: C.muted, fontWeight: '600', textAlign: 'center' },

  filterWrap:  { backgroundColor: C.white, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  filterRow:   { paddingHorizontal: 14, gap: 8 },
  chip:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F0F0F0', marginRight: 6 },
  chipActive:  { backgroundColor: C.red },
  chipTxt:     { color: C.text, fontSize: 13, fontWeight: '700' },
  chipTxtActive:{ color: '#FFF' },

  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  centerTxt:   { marginTop: 12, color: C.muted, fontSize: 14 },
  emptyTitle:  { fontSize: 18, fontWeight: '900', color: C.text, marginTop: 16 },
  emptyTxt:    { fontSize: 13, color: C.muted, marginTop: 6, textAlign: 'center' },
});

// Order Track Mode card styles
const tStyles = StyleSheet.create({
  card:         { backgroundColor: C.white, borderRadius: 16, borderWidth: 1, borderColor: C.border, marginBottom: 14, overflow: 'hidden', ...shadow },
  headerRow:    { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  orderId:      { fontSize: 20, fontWeight: '900', color: '#1A1A1A', letterSpacing: 0.2 },
  productLine:  { fontSize: 13, color: '#555', marginTop: 3, fontWeight: '500', lineHeight: 18 },
  statusBadge:  { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginLeft: 8, flexShrink: 0 },
  statusTxt:    { fontSize: 11, fontWeight: '900' },

  progressWrap: { paddingHorizontal: 16, paddingBottom: 10 },
  stepsRow:     { flexDirection: 'row', alignItems: 'center' },
  stepDot:      { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepDone:     { backgroundColor: C.green },
  stepActive:   { backgroundColor: C.red },
  stepPending:  { backgroundColor: '#E0E0E0' },
  stepLine:     { flex: 1, height: 3, backgroundColor: '#E0E0E0', marginHorizontal: 2 },
  stepLineDone: { backgroundColor: C.green },
  labelsRow:    { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingHorizontal: 2 },
  stepLbl:      { fontSize: 10, color: '#888', fontWeight: '600', flex: 1, textAlign: 'center' },
  stepLblActive:{ color: C.red, fontWeight: '900' },
  pBarBg:       { height: 4, backgroundColor: '#F0F0F0', borderRadius: 2, marginTop: 10 },
  pBarFill:     { height: 4, backgroundColor: C.red, borderRadius: 2 },

  expectedTxt:  { fontSize: 13, color: '#555', paddingHorizontal: 16, paddingBottom: 10, fontWeight: '500' },
  expectedBold: { fontWeight: '900', color: '#1A1A1A' },

  courierRow:   { flexDirection: 'row', alignItems: 'center', marginHorizontal: 14, marginBottom: 14, backgroundColor: '#FFF0F0', borderRadius: 12, padding: 12, gap: 10 },
  courierIcon:  { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFE0E0', alignItems: 'center', justifyContent: 'center' },
  courierName:  { fontSize: 13, fontWeight: '800', color: '#1A1A1A' },
  courierSub:   { fontSize: 11, color: '#888', marginTop: 2 },

  sectionTitle: { fontSize: 12, fontWeight: '900', color: C.red, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 12, paddingHorizontal: 16, paddingTop: 14 },
  detailRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 8, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  detailLbl:    { fontSize: 12, fontWeight: '600', color: '#888', flex: 1 },
  detailVal:    { fontSize: 12, fontWeight: '700', color: '#1A1A1A', textAlign: 'right', flexShrink: 1 },
});

// Shipment Card styles
const scStyles = StyleSheet.create({
  card:         { backgroundColor: C.white, borderRadius: 18, marginBottom: 14, overflow: 'hidden', ...shadow },
  header:       { backgroundColor: C.white, padding: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  orderId:      { fontSize: 17, fontWeight: '900', color: C.text },
  badge:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeTxt:     { fontSize: 11, fontWeight: '800' },
  details:      { color: C.muted, fontSize: 12, marginBottom: 14 },

  stepsRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  stepDot:      { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFCDD2' },
  stepDone:     { backgroundColor: C.green },
  stepActive:   { backgroundColor: C.red },
  stepPend:     { backgroundColor: '#E0E0E0' },
  stepLine:     { flex: 1, height: 3, backgroundColor: '#E0E0E0', marginHorizontal: 3 },
  stepLineDone: { backgroundColor: C.green },
  labelsRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  stepLbl:      { fontSize: 9, color: C.muted, fontWeight: '600', width: 60, textAlign: 'center' },
  pBarBg:       { height: 5, backgroundColor: '#FFCDD2', borderRadius: 3, marginBottom: 10, overflow: 'hidden' },
  pBarFill:     { height: '100%', backgroundColor: C.red, borderRadius: 3 },
  datesTxt:     { fontSize: 12, color: C.muted },

  courierRow:   { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#FFF5F5', gap: 10 },
  courierIcon:  { width: 42, height: 42, borderRadius: 10, backgroundColor: 'rgba(197,31,43,0.10)', alignItems: 'center', justifyContent: 'center' },
  courierName:  { fontSize: 13, fontWeight: '800', color: C.text, marginBottom: 2 },
  courierSub:   { fontSize: 11, color: C.muted },
  activeBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(197,31,43,0.10)', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8 },
  activeTxt:    { color: C.red, fontSize: 11, fontWeight: '800' },

  timelineWrap: { padding: 16, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  tlTitle:      { fontSize: 14, fontWeight: '900', color: C.text, marginBottom: 12 },
  tlDot:        { width: 12, height: 12, borderRadius: 6, backgroundColor: '#E0E0E0', zIndex: 2 },
  tlDotDone:    { backgroundColor: C.green },
  tlDotActive:  { backgroundColor: C.red },
  tlLine:       { position: 'absolute', left: 4, top: 14, width: 2, height: 26, backgroundColor: '#E0E0E0' },
  tlLineDone:   { backgroundColor: C.green },
  tlLabel:      { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 2 },
  tlLabelActive:{ color: C.red, fontWeight: '900' },
  tlLabelPend:  { color: '#BDBDBD' },
  tlTime:       { fontSize: 11, color: C.muted },

  itemsBox:     { marginTop: 12, backgroundColor: '#F8F9FA', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#EEEEEE' },
  itemsTitle:   { fontSize: 12, fontWeight: '800', color: C.text, marginBottom: 8 },
  itemRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  itemName:     { flex: 1, fontSize: 12, fontWeight: '600', color: '#555' },
  itemQty:      { fontSize: 11, fontWeight: '700', color: C.muted },
  itemPrice:    { fontSize: 11, fontWeight: '700', color: C.red, marginLeft: 4 },

  callBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, backgroundColor: 'rgba(197,31,43,0.08)', borderRadius: 10, paddingVertical: 11 },
  callTxt:      { color: C.red, fontSize: 13, fontWeight: '800' },

  // Bottom action row
  bottomRow:    { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  viewBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRightWidth: 1, borderRightColor: '#F0F0F0' },
  viewBtnTxt:   { color: C.red, fontSize: 13, fontWeight: '800' },
  rateBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13 },
  rateBtnTxt:   { color: C.red, fontSize: 13, fontWeight: '800' },

  // Delivered banner
  deliveredBanner:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#16A34A', padding: 12, paddingHorizontal: 14 },
  deliveredIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  deliveredTitle:    { fontSize: 13, fontWeight: '900', color: '#FFF', marginBottom: 2 },
  deliveredDate:     { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  deliveredEarly:    { fontSize: 10, fontWeight: '700' },
  rateNowBtn:        { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  rateNowTxt:        { color: '#FFF', fontSize: 11, fontWeight: '800' },

  // Rating panel
  ratingPanel:   { backgroundColor: '#FAFAFA', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', padding: 16 },
  ratingTitle:   { fontSize: 15, fontWeight: '900', color: C.text, textAlign: 'center', marginBottom: 3 },
  ratingSubtitle:{ fontSize: 12, color: C.muted, textAlign: 'center', marginBottom: 14 },
  starsRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  starItem:      { alignItems: 'center', flex: 1 },
  starIconWrap:  { width: 48, height: 52, borderRadius: 12, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent', marginBottom: 5, paddingTop: 4 },
  miniStarsRow:  { flexDirection: 'row', gap: 1, marginTop: 3 },
  starLbl:       { fontSize: 9, color: C.muted, fontWeight: '700', textAlign: 'center' },
});

export default DispatchTrackingPage;
