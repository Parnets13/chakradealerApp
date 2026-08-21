/**
 * ReportsDashboardSection.js
 * Dynamic reports page — calendar date picker + live data from /api/dealer/reports/dashboard
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import apiService from './services/apiService';

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  red:    '#E8374A',
  text:   '#0F172A',
  sub:    '#374151',
  muted:  '#6B7280',
  bg:     '#F1F4F8',
  white:  '#FFFFFF',
  border: '#E4E9F0',
  green:  '#16A34A',
  orange: '#EA580C',
  blue:   '#2563EB',
  purple: '#7C3AED',
};
const sh = {
  shadowColor: '#1B2A4A', shadowOpacity: 0.08,
  shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 4,
};

// ── Date helpers ──────────────────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getDateRange(period, customStart, customEnd) {
  const now   = new Date();
  const y     = now.getFullYear();
  const m     = now.getMonth();
  const d     = now.getDate();

  if (period === 'Today') {
    const s = new Date(y, m, d, 0, 0, 0);
    const e = new Date(y, m, d, 23, 59, 59);
    return { start: s, end: e, label: 'Today' };
  }
  if (period === 'This Week') {
    const dow = now.getDay();
    const s   = new Date(y, m, d - dow);
    const e   = new Date(y, m, d + (6 - dow), 23, 59, 59);
    return { start: s, end: e, label: 'This Week' };
  }
  if (period === 'This Month') {
    const s = new Date(y, m, 1);
    const e = new Date(y, m + 1, 0, 23, 59, 59);
    return { start: s, end: e, label: `${MONTH_FULL[m]} ${y}` };
  }
  if (period === 'This Year') {
    const s = new Date(y, 0, 1);
    const e = new Date(y, 11, 31, 23, 59, 59);
    return { start: s, end: e, label: `Year ${y}` };
  }
  if (period === 'Custom' && customStart && customEnd) {
    return {
      start: customStart, end: customEnd,
      label: `${fmtShort(customStart)} – ${fmtShort(customEnd)}`,
    };
  }
  // fallback — This Month
  return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0, 23, 59, 59), label: `${MONTH_FULL[m]} ${y}` };
}

const fmtShort = d => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
const numFmt   = n => Number(n || 0).toLocaleString('en-IN');
const fmtCur   = n => `₹${numFmt(n)}`;

// ── Calendar month picker (with inline month + year chooser) ─────────────────
function CalendarPicker({ visible, onClose, onSelect }) {
  const now  = new Date();
  const [viewYear,   setViewYear]   = useState(now.getFullYear());
  const [viewMonth,  setViewMonth]  = useState(now.getMonth());
  const [selStart,   setSelStart]   = useState(null);
  const [selEnd,     setSelEnd]     = useState(null);
  // 'calendar' | 'month' | 'year'
  const [pickerMode, setPickerMode] = useState('calendar');

  // year range: 5 years back, 2 ahead
  const yearList = Array.from({ length: 8 }, (_, i) => now.getFullYear() - 5 + i);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const days        = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks      = Array.from({ length: firstDay }, (_, i) => i);

  const tapDay = (day) => {
    const tapped = new Date(viewYear, viewMonth, day);
    if (!selStart || (selStart && selEnd)) {
      setSelStart(tapped); setSelEnd(null);
    } else {
      if (tapped < selStart) { setSelStart(tapped); setSelEnd(selStart); }
      else                   { setSelEnd(tapped); }
    }
  };

  const isStart = d => selStart && d.getTime() === selStart.getTime();
  const isEnd   = d => selEnd   && d.getTime() === selEnd.getTime();
  const inRange = d => selStart && selEnd && d > selStart && d < selEnd;

  const apply = () => {
    if (selStart && selEnd) {
      onSelect(selStart, new Date(selEnd.getFullYear(), selEnd.getMonth(), selEnd.getDate(), 23, 59, 59));
      onClose();
    } else if (selStart) {
      onSelect(selStart, new Date(selStart.getFullYear(), selStart.getMonth(), selStart.getDate(), 23, 59, 59));
      onClose();
    }
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={cal.overlay} onPress={onClose}>
        <Pressable style={cal.sheet} onPress={e => e.stopPropagation()}>

          {/* ── Header ── */}
          <View style={cal.hdr}>
            <Text style={cal.hdrTitle}>Select Date Range</Text>
            <Pressable onPress={onClose} style={cal.closeBtn}>
              <Icon name="close" size={20} color={C.muted} />
            </Pressable>
          </View>

          {/* ── Month + Year nav bar ── */}
          <View style={cal.monthNav}>
            {pickerMode === 'calendar' && (
              <Pressable style={cal.navArrow} onPress={prevMonth}>
                <Icon name="chevron-left" size={22} color={C.text} />
              </Pressable>
            )}

            {/* Tappable Month label */}
            <Pressable
              style={[cal.monthPill, pickerMode === 'month' && cal.monthPillOn]}
              onPress={() => setPickerMode(p => p === 'month' ? 'calendar' : 'month')}>
              <Text style={[cal.monthPillTxt, pickerMode === 'month' && { color: C.white }]}>
                {MONTHS[viewMonth]}
              </Text>
              <Icon name={pickerMode === 'month' ? 'chevron-up' : 'chevron-down'} size={14}
                color={pickerMode === 'month' ? C.white : C.red} />
            </Pressable>

            {/* Tappable Year label */}
            <Pressable
              style={[cal.monthPill, pickerMode === 'year' && cal.monthPillOn]}
              onPress={() => setPickerMode(p => p === 'year' ? 'calendar' : 'year')}>
              <Text style={[cal.monthPillTxt, pickerMode === 'year' && { color: C.white }]}>
                {viewYear}
              </Text>
              <Icon name={pickerMode === 'year' ? 'chevron-up' : 'chevron-down'} size={14}
                color={pickerMode === 'year' ? C.white : C.red} />
            </Pressable>

            {pickerMode === 'calendar' && (
              <Pressable style={cal.navArrow} onPress={nextMonth}>
                <Icon name="chevron-right" size={22} color={C.text} />
              </Pressable>
            )}
          </View>

          {/* ── Month chooser grid ── */}
          {pickerMode === 'month' && (
            <View style={cal.pickerGrid}>
              {MONTHS.map((m, i) => (
                <Pressable key={m} style={[cal.pickerCell, viewMonth === i && cal.pickerCellOn]}
                  onPress={() => { setViewMonth(i); setPickerMode('calendar'); }}>
                  <Text style={[cal.pickerCellTxt, viewMonth === i && cal.pickerCellTxtOn]}>{m}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* ── Year chooser grid ── */}
          {pickerMode === 'year' && (
            <View style={cal.pickerGrid}>
              {yearList.map(yr => (
                <Pressable key={yr} style={[cal.pickerCell, viewYear === yr && cal.pickerCellOn]}
                  onPress={() => { setViewYear(yr); setPickerMode('calendar'); }}>
                  <Text style={[cal.pickerCellTxt, viewYear === yr && cal.pickerCellTxtOn]}>{yr}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* ── Calendar grid ── */}
          {pickerMode === 'calendar' && (
            <>
              <View style={cal.dayRow}>
                {['S','M','T','W','T','F','S'].map((d, i) => (
                  <Text key={i} style={cal.dayHdr}>{d}</Text>
                ))}
              </View>
              <View style={cal.grid}>
                {blanks.map(b => <View key={`b${b}`} style={cal.cell} />)}
                {days.map(day => {
                  const dt      = new Date(viewYear, viewMonth, day);
                  const start   = isStart(dt);
                  const end     = isEnd(dt);
                  const range   = inRange(dt);
                  const isToday = dt.toDateString() === new Date().toDateString();
                  return (
                    <Pressable key={day}
                      style={[cal.cell, range && cal.cellRange, (start || end) && cal.cellSelected]}
                      onPress={() => tapDay(day)}>
                      <Text style={[
                        cal.cellTxt,
                        range && { color: C.red },
                        (start || end) && cal.cellTxtSel,
                        isToday && !start && !end && { color: C.red, fontWeight: '800' },
                      ]}>
                        {day}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {/* ── Selection strip ── */}
          <View style={cal.selRow}>
            <View style={cal.selItem}>
              <Text style={cal.selLbl}>FROM</Text>
              <Text style={cal.selVal}>{selStart ? fmtShort(selStart) : '—'}</Text>
            </View>
            <View style={cal.selArrow}>
              <Icon name="arrow-right" size={16} color={C.muted} />
            </View>
            <View style={cal.selItem}>
              <Text style={cal.selLbl}>TO</Text>
              <Text style={cal.selVal}>{selEnd ? fmtShort(selEnd) : '—'}</Text>
            </View>
          </View>

          {/* ── Apply button ── */}
          <Pressable style={[cal.applyBtn, !selStart && { opacity: 0.4 }]} onPress={apply} disabled={!selStart}>
            <Icon name="check-circle-outline" size={18} color={C.white} />
            <Text style={cal.applyTxt}>Apply Range</Text>
          </Pressable>

        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Summary stat tile ─────────────────────────────────────────────────────────
function StatTile({ label, value, icon, color, bg, sub }) {
  return (
    <View style={[st.tile, { backgroundColor: bg, borderColor: color + '30' }]}>
      <View style={[st.iconWrap, { backgroundColor: color + '18' }]}>
        <Icon name={icon} size={18} color={color} />
      </View>
      <Text style={[st.val, { color }]}>{value}</Text>
      <Text style={st.lbl}>{label}</Text>
      {sub ? <Text style={st.sub}>{sub}</Text> : null}
    </View>
  );
}

// ── Report card ───────────────────────────────────────────────────────────────
function ReportCard({ title, icon, color, value, sub, badge, onPress }) {
  return (
    <Pressable style={rc.card} onPress={onPress}>
      <View style={[rc.iconBox, { backgroundColor: color + '15' }]}>
        <Icon name={icon} size={26} color={color} />
      </View>
      <View style={rc.info}>
        <Text style={rc.title}>{title}</Text>
        <Text style={rc.value}>{value}</Text>
        {sub ? <Text style={rc.sub}>{sub}</Text> : null}
      </View>
      {badge ? (
        <View style={[rc.badge, { backgroundColor: badge.color + '18', borderColor: badge.color + '40' }]}>
          <Text style={[rc.badgeTxt, { color: badge.color }]}>{badge.label}</Text>
        </View>
      ) : (
        <View style={rc.arrow}>
          <Icon name="chevron-right" size={18} color={C.muted} />
        </View>
      )}
    </Pressable>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function ReportsDashboardSection({ onBack }) {
  const [period,      setPeriod]      = useState('This Month');
  const [customStart, setCustomStart] = useState(null);
  const [customEnd,   setCustomEnd]   = useState(null);
  const [calVisible,  setCalVisible]  = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [data,        setData]        = useState(null);
  const [error,       setError]       = useState(null);

  const PERIODS = ['Today', 'This Week', 'This Month', 'This Year'];

  const { start, end, label } = getDateRange(period, customStart, customEnd);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await apiService.get('/reports/dashboard', {
        startDate: start.toISOString(),
        endDate:   end.toISOString(),
      });
      if (res?.success) setData(res.data);
      else setError('Failed to load reports');
    } catch (e) {
      setError(e.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [start.toISOString(), end.toISOString()]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onCustomRange = (s, e) => {
    setCustomStart(s); setCustomEnd(e); setPeriod('Custom');
  };

  // Build report cards from live data
  const d = data || {};
  const reportCards = [
    {
      id: 'sales',
      title: 'Sales Report',
      icon: 'chart-line',
      color: '#16A34A',
      value: fmtCur(d.sales?.total || 0),
      sub: `${d.orders?.total || 0} orders · avg ${fmtCur(d.sales?.avgOrderValue || 0)}`,
      badge: d.orders?.completed > 0 ? { label: `${d.orders.completed} done`, color: '#16A34A' } : null,
    },
    {
      id: 'invoices',
      title: 'Invoice Report',
      icon: 'file-document-outline',
      color: '#2563EB',
      value: `${d.invoices?.total || 0} invoices`,
      sub: `${d.invoices?.paid || 0} paid · ${d.invoices?.pending || 0} pending`,
      badge: d.invoices?.pendingAmount > 0 ? { label: `${fmtCur(d.invoices.pendingAmount)} due`, color: '#D97706' } : null,
    },
    {
      id: 'orders',
      title: 'Order Report',
      icon: 'clipboard-list-outline',
      color: '#7C3AED',
      value: `${d.orders?.total || 0} orders`,
      sub: `${d.orders?.pending || 0} pending · ${d.orders?.completed || 0} delivered`,
      badge: null,
    },
    {
      id: 'dispatch',
      title: 'Dispatch Report',
      icon: 'truck-delivery',
      color: '#EA580C',
      value: `${d.dispatch?.inTransit || 0} in transit`,
      sub: `${d.dispatch?.delivered || 0} delivered`,
      badge: d.dispatch?.inTransit > 0 ? { label: 'Active', color: '#EA580C' } : null,
    },
    {
      id: 'inventory',
      title: 'Inventory Report',
      icon: 'package-variant',
      color: '#0891B2',
      value: `${d.inventory?.lowStockItems || 0} low stock`,
      sub: 'Items below reorder point',
      badge: d.inventory?.lowStockItems > 0 ? { label: 'Attention', color: '#EF4444' } : null,
    },
    {
      id: 'payment',
      title: 'Payment Report',
      icon: 'cash-multiple',
      color: '#DB2777',
      value: fmtCur(d.invoices?.pendingAmount || 0),
      sub: 'Total outstanding amount',
      badge: null,
    },
  ];

  return (
    <View style={s.screen}>

      {/* ── Navbar ── */}
      <View style={s.nav}>
        <Pressable style={s.navBtn} onPress={onBack}>
          <Icon name="arrow-left" size={22} color={C.white} />
        </Pressable>
        <View style={s.navCenter}>
          <View style={s.navIconWrap}>
            <Icon name="chart-bar" size={17} color={C.white} />
          </View>
          <View>
            <Text style={s.navTitle}>Reports Dashboard</Text>
            <Text style={s.navSub}>{label}</Text>
          </View>
        </View>
        <Pressable style={s.navBtn} onPress={fetchData}>
          <Icon name="refresh" size={20} color={C.white} />
        </Pressable>
      </View>

      {/* ── Period quick tabs ── */}
      <View style={s.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabRow}>
          {PERIODS.map(p => {
            const isOn = period === p;
            return (
              <Pressable key={p} style={[s.tab, isOn && s.tabOn]} onPress={() => setPeriod(p)}>
                <Text style={[s.tabTxt, isOn && s.tabTxtOn]}>{p}</Text>
              </Pressable>
            );
          })}

          {/* Calendar picker trigger */}
          <Pressable
            style={[s.tab, s.calTab, period === 'Custom' && s.tabOn]}
            onPress={() => setCalVisible(true)}>
            <Icon name="calendar-range" size={13} color={period === 'Custom' ? C.white : C.red} />
            <Text style={[s.tabTxt, { color: period === 'Custom' ? C.white : C.red }, period === 'Custom' && s.tabTxtOn]}>
              {period === 'Custom' ? `${fmtShort(customStart)} – ${fmtShort(customEnd)}` : 'Custom'}
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* ── Date range display bar ── */}
      <View style={s.dateBar}>
        <Icon name="calendar-outline" size={13} color={C.muted} />
        <Text style={s.dateTxt}>{fmtShort(start)}  →  {fmtShort(end)}</Text>
        <Pressable onPress={() => setCalVisible(true)} style={s.editDateBtn}>
          <Icon name="pencil-outline" size={12} color={C.red} />
          <Text style={s.editDateTxt}>Edit</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.body}>

        {loading ? (
          <View style={s.loadWrap}>
            <View style={s.loadCircle}>
              <ActivityIndicator size="large" color={C.red} />
            </View>
            <Text style={s.loadTxt}>Loading report data…</Text>
          </View>
        ) : error ? (
          <View style={s.errorWrap}>
            <View style={s.errorIcon}>
              <Icon name="wifi-off" size={32} color={C.red} style={{ opacity: 0.5 }} />
            </View>
            <Text style={s.errorTitle}>Could not load reports</Text>
            <Text style={s.errorTxt}>{error}</Text>
            <Pressable style={s.retryBtn} onPress={fetchData}>
              <Icon name="refresh" size={15} color={C.white} />
              <Text style={s.retryTxt}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* ── Summary tiles 2×2 ── */}
            <Text style={s.sectionLbl}>SUMMARY</Text>
            <View style={s.tilesGrid}>
              <StatTile label="Total Sales"    value={fmtCur(d.sales?.total || 0)}     icon="chart-line"            color="#16A34A" bg="#F0FDF4" />
              <StatTile label="Orders"         value={String(d.orders?.total || 0)}     icon="clipboard-list-outline" color="#7C3AED" bg="#FAF5FF" />
              <StatTile label="In Transit"     value={String(d.dispatch?.inTransit||0)} icon="truck-delivery"         color="#EA580C" bg="#FFF7ED" />
              <StatTile label="Pending Amount" value={fmtCur(d.invoices?.pendingAmount||0)} icon="cash-remove"       color="#DC2626" bg="#FFF1F2" />
            </View>

            {/* ── Report cards ── */}
            <Text style={s.sectionLbl}>REPORTS</Text>
            {reportCards.map(r => (
              <ReportCard
                key={r.id}
                {...r}
                onPress={() => Alert.alert(r.title, `${r.value}\n${r.sub || ''}\n\nPeriod: ${label}`)}
              />
            ))}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Calendar modal ── */}
      <CalendarPicker
        visible={calVisible}
        onClose={() => setCalVisible(false)}
        onSelect={onCustomRange}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: C.bg },

  // Navbar
  nav:          { backgroundColor: C.red, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, ...sh },
  navBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  navCenter:    { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'center' },
  navIconWrap:  { width: 32, height: 32, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  navTitle:     { color: C.white, fontSize: 16, fontWeight: '900' },
  navSub:       { color: 'rgba(255,255,255,0.78)', fontSize: 11, fontWeight: '600', marginTop: 1 },

  // Period tabs
  tabBar:       { backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: '#EEF0F5' },
  tabRow:       { paddingHorizontal: 12, paddingVertical: 10, gap: 7, alignItems: 'center' },
  tab:          { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F1F4F8', borderWidth: 1.5, borderColor: '#E4E9F0' },
  tabOn:        { backgroundColor: C.red, borderColor: C.red },
  calTab:       { flexDirection: 'row', alignItems: 'center', gap: 5, borderColor: '#FECDD3', backgroundColor: '#FFF1F2' },
  tabTxt:       { fontSize: 12, fontWeight: '700', color: C.sub },
  tabTxtOn:     { color: C.white, fontWeight: '900' },

  // Date bar
  dateBar:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.white, paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#EEF0F5' },
  dateTxt:      { flex: 1, fontSize: 12, color: C.muted, fontWeight: '600' },
  editDateBtn:  { flexDirection: 'row', alignItems: 'center', gap: 3 },
  editDateTxt:  { fontSize: 11, fontWeight: '800', color: C.red },

  // Body
  body:         { padding: 14 },
  sectionLbl:   { fontSize: 10, fontWeight: '900', color: C.muted, letterSpacing: 1, marginBottom: 10, marginTop: 6 },

  // Summary tiles
  tilesGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },

  // Loading / Error
  loadWrap:     { alignItems: 'center', paddingTop: 60 },
  loadCircle:   { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF1F2', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  loadTxt:      { fontSize: 14, color: C.muted, fontWeight: '600' },
  errorWrap:    { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  errorIcon:    { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF1F2', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  errorTitle:   { fontSize: 17, fontWeight: '900', color: C.text, marginBottom: 6 },
  errorTxt:     { fontSize: 12, color: C.muted, textAlign: 'center', lineHeight: 18, marginBottom: 20 },
  retryBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.red, borderRadius: 20, paddingHorizontal: 22, paddingVertical: 10 },
  retryTxt:     { color: C.white, fontSize: 13, fontWeight: '800' },
});

// Stat tile styles
const st = StyleSheet.create({
  tile:     { width: '47%', borderRadius: 14, padding: 14, borderWidth: 1.5, gap: 5, ...sh },
  iconWrap: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  val:      { fontSize: 18, fontWeight: '900', lineHeight: 22 },
  lbl:      { fontSize: 11, color: C.muted, fontWeight: '700' },
  sub:      { fontSize: 10, color: C.muted },
});

// Report card styles
const rc = StyleSheet.create({
  card:     { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#EEF0F5', gap: 14, ...sh },
  iconBox:  { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  info:     { flex: 1 },
  title:    { fontSize: 14, fontWeight: '800', color: C.text, marginBottom: 3 },
  value:    { fontSize: 15, fontWeight: '900', color: C.text, marginBottom: 2 },
  sub:      { fontSize: 11, color: C.muted, fontWeight: '500' },
  badge:    { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
  badgeTxt: { fontSize: 10, fontWeight: '800' },
  arrow:    { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F8F9FA', alignItems: 'center', justifyContent: 'center' },
});

// Calendar styles
const cal = StyleSheet.create({
  overlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:           { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 },

  // Header
  hdr:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  hdrTitle:        { fontSize: 17, fontWeight: '900', color: C.text },
  closeBtn:        { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F4F8', alignItems: 'center', justifyContent: 'center' },

  // Month+Year nav bar
  monthNav:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 8 },
  navArrow:        { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F4F8', alignItems: 'center', justifyContent: 'center' },
  // Tappable month / year pills
  monthPill:       { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'center', backgroundColor: '#F1F4F8', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1.5, borderColor: '#E4E9F0' },
  monthPillOn:     { backgroundColor: C.red, borderColor: C.red },
  monthPillTxt:    { fontSize: 14, fontWeight: '800', color: C.text },

  // Month / Year picker grids
  pickerGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  pickerCell:      { width: '22%', paddingVertical: 10, borderRadius: 10, backgroundColor: '#F8F9FA', alignItems: 'center', borderWidth: 1.5, borderColor: '#EEF0F5' },
  pickerCellOn:    { backgroundColor: C.red, borderColor: C.red },
  pickerCellTxt:   { fontSize: 13, fontWeight: '700', color: C.sub },
  pickerCellTxtOn: { color: C.white, fontWeight: '900' },

  // Calendar grid
  dayRow:          { flexDirection: 'row', marginBottom: 6 },
  dayHdr:          { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: C.muted },
  grid:            { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  cell:            { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  cellRange:       { backgroundColor: '#FFF1F2' },
  cellSelected:    { backgroundColor: C.red, borderRadius: 20 },
  cellTxt:         { fontSize: 13, fontWeight: '600', color: C.text },
  cellTxtSel:      { color: C.white, fontWeight: '900' },

  // Selection strip
  selRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF1F2', borderRadius: 12, padding: 14, marginTop: 10, marginBottom: 14 },
  selItem:         { alignItems: 'center', flex: 1 },
  selArrow:        { paddingHorizontal: 6 },
  selLbl:          { fontSize: 10, fontWeight: '700', color: C.muted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
  selVal:          { fontSize: 13, fontWeight: '800', color: C.text },

  // Apply
  applyBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.red, borderRadius: 14, paddingVertical: 14 },
  applyTxt:        { color: C.white, fontSize: 15, fontWeight: '900' },
});
