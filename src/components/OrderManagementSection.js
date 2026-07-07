/**
 * OrderManagementSection.js
 * Dealer "My Orders" screen.
 *
 * Changes:
 *  • Status-bar area (SafeAreaView top edge) matches navbar red
 *  • Each card: Track Order (left) | Edit (middle) | Delete (right)
 *  • Delete: confirms → DELETE /orders/:id → removes from list
 *  • Edit:   only for 'Order Placed' / 'Pending Approval'
 *            opens modal to change priority + notes → PUT /orders/:id
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import apiService from './services/apiService';

// ─── Theme ────────────────────────────────────────────────────────────────────
const C = {
  red:      '#C51F2B',
  redDark:  '#A3101B',
  bg:       '#F2F0EC',
  white:    '#FFFFFF',
  text:     '#1A1A1A',
  sub:      '#555555',
  muted:    '#888888',
  line:     '#E8E4DE',
  green:    '#1A7A3C',  greenBg:  '#E4F5EC',
  amber:    '#B86A00',  amberBg:  '#FEF3E2',
  blue:     '#1565C0',  blueBg:   '#E3F0FF',
  teal:     '#1A7A6E',  tealBg:   '#E4F5F3',
  purple:   '#6A1B9A',  purpleBg: '#F3E5F5',
  navy:     '#0277BD',  navyBg:   '#E1F5FE',
  olive:    '#558B2F',  oliveBg:  '#F1F8E9',
};

const shadow = {
  shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
};

// ─── Status lists ─────────────────────────────────────────────────────────────
const ALL_STATUSES = [
  'All','Order Placed','Pending Approval','Approved','Rejected',
  'Picking Started','Picking Completed','Sorting Started','Sorting Completed',
  'Packing Started','Packing Completed','Invoice Generated','Ready for Dispatch',
  'Dispatched','In Transit','Delivered','Cancelled',
];

// Statuses where edit is still allowed
const EDITABLE_STATUSES = ['Order Placed', 'Pending Approval'];

const STATUS_MAP = {
  'Order Placed':       { color: C.blue,        bg: C.blueBg   },
  'Pending Approval':   { color: C.amber,        bg: C.amberBg  },
  'Approved':           { color: C.green,        bg: C.greenBg  },
  'Rejected':           { color: C.red,          bg: '#FFF5F5'  },
  'Picking Started':    { color: C.purple,       bg: C.purpleBg },
  'Picking Completed':  { color: C.purple,       bg: '#EDE7F6'  },
  'Sorting Started':    { color: C.teal,         bg: C.tealBg   },
  'Sorting Completed':  { color: C.teal,         bg: '#B2DFDB'  },
  'Packing Started':    { color: C.navy,         bg: C.navyBg   },
  'Packing Completed':  { color: C.navy,         bg: '#B3E5FC'  },
  'Invoice Generated':  { color: C.blue,         bg: '#E3F2FD'  },
  'Ready for Dispatch': { color: C.olive,        bg: C.oliveBg  },
  'Dispatched':         { color: '#827717',      bg: '#F9FBE7'  },
  'In Transit':         { color: C.teal,         bg: C.tealBg   },
  'Delivered':          { color: C.green,        bg: C.greenBg  },
  'Cancelled':          { color: C.red,          bg: '#FFF5F5'  },
};

const PRIORITY_OPTIONS = ['Normal', 'High', 'Urgent'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return String(d); }
};

const fmtAmount = (order) => {
  if (order.amount && typeof order.amount === 'string') return order.amount;
  const v = order.value || order.totalAmount || 0;
  return `₹${Number(v).toLocaleString('en-IN')}`;
};

const getItemsInfo = (order) => {
  const list =
    Array.isArray(order.lineItems) && order.lineItems.length > 0 ? order.lineItems
    : Array.isArray(order.items)   && order.items.length   > 0 ? order.items
    : [];
  if (list.length === 0) return { firstName: '—', firstCategory: '—', count: 0 };
  const first = list[0];
  return {
    firstName:     first.name     || first.itemName || '—',
    firstCategory: first.category || '—',
    count: list.length,
  };
};

// ─── EditOrderModal ─────────────r──────────────────────────────────────────────
function EditOrderModal({ visible, order, onClose, onSaved }) {
  const [priority, setPriority] = useState('Normal');
  const [notes,    setNotes]    = useState('');
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    if (order) {
      setPriority(order.priority || 'Normal');
      setNotes(order.notes || '');
    }
  }, [order]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const id = order?.orderId || order?._id || order?.id;
      await apiService.put(`/orders/${id}`, { priority, notes });
      onSaved({ ...order, priority, notes });
      onClose();
    } catch (err) {
      Alert.alert('Update Failed', err?.message || 'Could not update order.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={ms.overlay}>
        <View style={ms.sheet}>
          <View style={ms.sheetHeader}>
            <Text style={ms.sheetTitle}>Edit Order</Text>
            <Pressable onPress={onClose} style={ms.closeBtn}>
              <Icon name="close" size={20} color={C.text} />
            </Pressable>
          </View>

          <Text style={ms.label}>Priority</Text>
          <View style={ms.priorityRow}>
            {PRIORITY_OPTIONS.map((p) => (
              <Pressable
                key={p}
                onPress={() => setPriority(p)}
                style={[ms.priorityChip, priority === p && ms.priorityChipActive]}>
                <Text style={[ms.priorityChipText, priority === p && ms.priorityChipTextActive]}>
                  {p}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={ms.label}>Notes</Text>
          <TextInput
            style={ms.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add notes for admin…"
            placeholderTextColor={C.muted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[ms.saveBtn, saving && ms.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}>
            {saving
              ? <ActivityIndicator color={C.white} size="small" />
              : <Text style={ms.saveBtnText}>Save Changes</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const ms = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:     { backgroundColor: C.white, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 36 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  sheetTitle:  { flex: 1, fontSize: 18, fontWeight: '900', color: C.text },
  closeBtn:    { padding: 4 },
  label:       { fontSize: 12, fontWeight: '800', color: C.muted, letterSpacing: 0.6, marginBottom: 8, marginTop: 4 },
  priorityRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  priorityChip: {
    flex: 1, alignItems: 'center', paddingVertical: 9,
    borderRadius: 10, borderWidth: 1.5, borderColor: C.line, backgroundColor: '#F8F8F8',
  },
  priorityChipActive:    { backgroundColor: C.red, borderColor: C.red },
  priorityChipText:      { fontSize: 13, fontWeight: '700', color: C.sub },
  priorityChipTextActive:{ color: C.white, fontWeight: '900' },
  notesInput: {
    borderWidth: 1.5, borderColor: C.line, borderRadius: 12,
    padding: 12, fontSize: 14, color: C.text, minHeight: 80, marginBottom: 20,
  },
  saveBtn:         { backgroundColor: C.red, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnDisabled: { backgroundColor: '#a4170aff' },
  saveBtnText:     { color: C.white, fontSize: 15, fontWeight: '900' },
});

// ─── OrderCard ────────────────────────────────────────────────────────────────
function OrderCard({ order, onTrack, onEdit, onDelete }) {
  const st = STATUS_MAP[order.status] || { color: C.muted, bg: '#F2F2F2' };
  const { firstName, firstCategory, count } = getItemsInfo(order);
  const isERP      = (order.source || '').toUpperCase() === 'ERP';
  const canEdit    = EDITABLE_STATUSES.includes(order.status);
  const orderId    = order.orderId || order.id || '—';

  return (
    <View style={styles.card}>

      {/* ── Header row ── */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.orderIdRow}>
            <Icon name="receipt" size={14} color={C.muted} />
            <Text style={styles.orderId}>{orderId}</Text>
          </View>
          <View style={styles.orderMetaRow}>
            <Icon name="calendar-outline" size={11} color={C.muted} />
            <Text style={styles.orderDate}>{fmtDate(order.createdAt || order.orderDate)}</Text>
            <View style={styles.sourceChip}>
              <Icon name={isERP ? 'desktop-classic' : 'cellphone'} size={9} color={C.muted} />
              <Text style={styles.sourceText}>{isERP ? 'ERP' : 'App'}</Text>
            </View>
          </View>
        </View>
        <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
          <Text style={[styles.statusLabel, { color: st.color }]}>
            {order.status || 'Unknown'}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* ── Product info ── */}
      <View style={styles.productBox}>
        <View style={styles.productIconWrap}>
          <Icon name="package-variant" size={20} color={C.red} />
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>{firstName}</Text>
          <Text style={styles.productCategory}>Category: {firstCategory}</Text>
          <Text style={styles.productCount}>
            {count > 0 ? `${count} item${count !== 1 ? 's' : ''}` : 'No items'}
          </Text>
        </View>
        <View style={styles.valueBox}>
          <Text style={styles.valueAmount}>{fmtAmount(order)}</Text>
          <Text style={styles.valueLabel}>Total</Text>
        </View>
      </View>

      {/* ── GST / priority row ── */}
      {(order.totalGst || 0) > 0 && (
        <View style={styles.gstRow}>
          <Icon name="percent" size={10} color={C.navy} />
          <Text style={styles.gstText}>
            GST ₹{Number(order.totalGst).toLocaleString('en-IN')}
          </Text>
          {order.priority && order.priority !== 'Normal' && (
            <>
              <Text style={styles.dotSep}>·</Text>
              <Text style={[styles.priorityText,
                (order.priority === 'Urgent' || order.priority === 'High') && { color: C.red }]}>
                {order.priority}
              </Text>
            </>
          )}
        </View>
      )}

      {/* ── Dispatch info ── */}
      {order.dispatchInfo?.transportName ? (
        <View style={styles.dispatchBox}>
          <Icon name="truck-delivery-outline" size={13} color={C.teal} />
          <Text style={styles.dispatchText}>
            {order.dispatchInfo.transportName}
            {order.dispatchInfo.lrNumber ? `  ·  LR: ${order.dispatchInfo.lrNumber}` : ''}
          </Text>
        </View>
      ) : null}

      {/* ── Action row: Track | Edit | Delete ── */}
      <View style={styles.actionRow}>

        {/* Track Order — left, takes remaining space */}
        <Pressable style={styles.trackBtn} onPress={() => onTrack && onTrack(orderId, order)}>
          <Icon name="truck-fast-outline" size={15} color={C.white} />
          <Text style={styles.trackBtnText}>Track Order</Text>
        </Pressable>

        {/* Edit button */}
        <Pressable
          style={[styles.iconActionBtn, styles.editBtn, !canEdit && styles.iconActionBtnDisabled]}
          onPress={() => canEdit && onEdit && onEdit(order)}
          disabled={!canEdit}>
          <Icon name="pencil-outline" size={16} color={canEdit ? C.white : 'rgba(255,255,255,0.4)'} />
        </Pressable>

        {/* Delete button */}
        <Pressable
          style={[styles.iconActionBtn, styles.deleteBtn]}
          onPress={() => onDelete && onDelete(orderId, order)}>
          <Icon name="trash-can-outline" size={16} color={C.white} />
        </Pressable>

      </View>

      {/* Edit disabled hint */}
      {!canEdit && (
        <Text style={styles.editHint}>Edit unavailable — order is already being processed</Text>
      )}

    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
/**
 * Props:
 *   onBack                    — go back to home
 *   onNavigateToDispatch(id)  — track order navigation
 *   initialOrders             — optional array: pre-inject freshly placed orders
 *                               so they show instantly before API responds
 */
export default function OrderManagementSection({ onBack, onNavigateToDispatch, initialOrders }) {
  const [orders,       setOrders]       = useState(Array.isArray(initialOrders) ? initialOrders : []);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [search,       setSearch]       = useState('');
  const [editOrder,    setEditOrder]    = useState(null); // order being edited

  // ── Fetch orders ──────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await apiService.get('/orders', {
        ...(activeFilter !== 'All' && { status: activeFilter }),
        ...(search.trim() && { search: search.trim() }),
        limit: 100,
      });
      if (res && res.success) {
        const fetched = res.data || [];
        // Merge: keep any initialOrders that haven't arrived from API yet
        // (prevents flicker where the new card disappears before API confirms it)
        if (Array.isArray(initialOrders) && initialOrders.length > 0) {
          const fetchedIds = new Set(
            fetched.map((o) => o.orderId || o._id || o.id).filter(Boolean)
          );
          const missing = initialOrders.filter(
            (o) => !fetchedIds.has(o.orderId || o._id || o.id)
          );
          setOrders([...missing, ...fetched]);
        } else {
          setOrders(fetched);
        }
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

  const onRefresh = () => { setRefreshing(true); fetchOrders(true); };

  // ── Track handler ─────────────────────────────────────────────────────────
  const handleTrack = (orderId) => {
    if (onNavigateToDispatch) onNavigateToDispatch(orderId);
  };

  // ── Delete handler ────────────────────────────────────────────────────────
  const handleDelete = (orderId, order) => {
    Alert.alert(
      'Delete Order',
      `Are you sure you want to delete order ${orderId}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const id = order?._id || order?.mongodbId || orderId;
              await apiService.delete(`/orders/${id}`);
              setOrders((prev) =>
                prev.filter((o) => (o.orderId || o.id) !== orderId)
              );
            } catch (err) {
              Alert.alert('Delete Failed', err?.message || 'Could not delete order.');
            }
          },
        },
      ]
    );
  };

  // ── Edit saved callback ───────────────────────────────────────────────────
  const handleEditSaved = (updated) => {
    setOrders((prev) =>
      prev.map((o) =>
        (o.orderId || o.id) === (updated.orderId || updated.id) ? { ...o, ...updated } : o
      )
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>

      {/* Status-bar area is automatically red because SafeAreaView
          top background = C.red (set via style.screen + navbarTop trick) */}

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
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}>
          {ALL_STATUSES.map((f) => (
            <Pressable key={f} onPress={() => setActiveFilter(f)}
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
              colors={[C.red]} tintColor={C.red} />
          }>

          <Text style={styles.countText}>
            {orders.length} order{orders.length !== 1 ? 's' : ''}
            {activeFilter !== 'All' ? ` · ${activeFilter}` : ''}
          </Text>

          {orders.length === 0 ? (
            <View style={styles.empty}>
              <Icon name="package-variant" size={64} color={C.muted} />
              <Text style={styles.emptyTitle}>No Orders Yet</Text>
              <Text style={styles.emptyText}>
                {search ? 'Try a different search term'
                  : activeFilter !== 'All' ? `No "${activeFilter}" orders`
                  : 'Start shopping to place your first order'}
              </Text>
              {!search && activeFilter === 'All' && (
                <Pressable style={styles.shopBtn} onPress={() => onBack && onBack()}>
                  <Icon name="shopping" size={16} color={C.white} />
                  <Text style={styles.shopBtnText}>Start Shopping</Text>
                </Pressable>
              )}
            </View>
          ) : (
            orders.map((order) => (
              <OrderCard
                key={order.mongodbId || order._id || order.id || order.orderId}
                order={order}
                onTrack={handleTrack}
                onEdit={(o) => setEditOrder(o)}
                onDelete={handleDelete}
              />
            ))
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ── Edit modal ── */}
      <EditOrderModal
        visible={!!editOrder}
        order={editOrder}
        onClose={() => setEditOrder(null)}
        onSaved={handleEditSaved}
      />

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // SafeAreaView background = red so the status-bar area is dark red
  screen: { flex: 1, backgroundColor: C.red },

  // Navbar
  navbar: {
    height: 56,
    backgroundColor: C.red,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  navBack: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  navTitle:   { flex: 1, color: C.white, fontSize: 20, fontWeight: '900' },
  navRefresh: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  // The rest of the page body is light bg
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.white, margin: 12,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
    gap: 8, borderWidth: 1, borderColor: C.line, ...shadow,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.text, fontWeight: '500' },

  filterBar: {
    backgroundColor: C.white,
    borderBottomWidth: 1, borderBottomColor: C.line,
  },
  filterScroll: {
    paddingHorizontal: 12, paddingVertical: 10, gap: 8, flexDirection: 'row',
  },
  filterPill: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.white,
  },
  filterPillActive:    { backgroundColor: C.red, borderColor: C.red },
  filterText:          { fontSize: 11, fontWeight: '700', color: C.text },
  filterTextActive:    { color: C.white, fontWeight: '900' },

  list:        { flex: 1, backgroundColor: C.bg },
  listContent: { padding: 12, gap: 12 },
  countText:   { fontSize: 12, fontWeight: '700', color: C.muted, marginBottom: 4, marginLeft: 4 },

  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  loadingText: { marginTop: 12, fontSize: 14, color: C.muted },

  empty:       { alignItems: 'center', paddingTop: 80 },
  emptyTitle:  { fontSize: 18, fontWeight: '900', color: C.text, marginTop: 16 },
  emptyText:   { fontSize: 13, color: C.muted, marginTop: 6, textAlign: 'center', paddingHorizontal: 32 },
  shopBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 20, backgroundColor: C.red, borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 12,
  },
  shopBtnText: { color: C.white, fontSize: 14, fontWeight: '800' },

  // ── Card ──
  card: {
    backgroundColor: C.white,
    borderRadius: 18, borderWidth: 1, borderColor: C.line,
    padding: 16, ...shadow,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 12,
  },
  cardHeaderLeft: { flex: 1, marginRight: 10 },
  orderIdRow:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  orderId:      { fontSize: 15, fontWeight: '900', color: C.text, letterSpacing: 0.2 },
  orderMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  orderDate:    { fontSize: 11, fontWeight: '600', color: C.muted },
  sourceChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#F1F3F5', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2, marginLeft: 4,
  },
  sourceText:  { fontSize: 9,  fontWeight: '700', color: C.muted },
  statusPill:  { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, flexShrink: 0 },
  statusLabel: { fontSize: 9,  fontWeight: '800', textTransform: 'uppercase' },

  divider: { height: 1, backgroundColor: C.line, marginBottom: 12 },

  productBox: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#F8F9FA', borderRadius: 12,
    padding: 10, marginBottom: 8,
    borderWidth: 1, borderColor: '#EEEEEE',
  },
  productIconWrap: {
    width: 36, height: 36, borderRadius: 9,
    backgroundColor: 'rgba(208,40,26,0.08)',
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  productInfo:     { flex: 1 },
  productName:     { fontSize: 13, fontWeight: '800', color: C.text, marginBottom: 2 },
  productCategory: { fontSize: 10, fontWeight: '600', color: C.muted, marginBottom: 2 },
  productCount:    { fontSize: 10, fontWeight: '700', color: C.sub },
  valueBox:        { alignItems: 'flex-end', marginLeft: 8 },
  valueAmount:     { fontSize: 15, fontWeight: '900', color: C.red },
  valueLabel:      { fontSize: 9,  fontWeight: '700', color: C.muted, marginTop: 2 },

  gstRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  gstText:      { fontSize: 10, fontWeight: '700', color: C.navy },
  dotSep:       { color: C.muted, fontSize: 10 },
  priorityText: { fontSize: 10, fontWeight: '700', color: C.sub },

  dispatchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#E4F5F3', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, marginBottom: 8,
  },
  dispatchText: { fontSize: 11, fontWeight: '600', color: C.teal, flex: 1 },

  // ── Action row ──
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  // Track Order — grows to fill left space
  trackBtn: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: C.red,
    borderRadius: 10, paddingVertical: 10,
  },
  trackBtnText: { color: C.white, fontSize: 13, fontWeight: '900' },

  // Square icon buttons (Edit / Delete)
  iconActionBtn: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  editBtn:               { backgroundColor: '#1565C0' },
  deleteBtn:             { backgroundColor: '#580606ff' },
  iconActionBtnDisabled: { backgroundColor: '#B0BEC5' },

  editHint: {
    fontSize: 10, color: C.muted, textAlign: 'center',
    marginTop: 5, fontStyle: 'italic',
  },
});
