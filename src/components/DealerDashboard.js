import React, {useState, useEffect} from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Svg, {Circle, Defs, LinearGradient, Path, Stop, Rect, G} from 'react-native-svg';

const {width: SCREEN_W} = Dimensions.get('window');

import {shadow} from './theme';
import OrdersPage from './OrdersPage';
import InventoryPage from './InventoryPage';
import DispatchTrackingPage from './DispatchTrackingPage';
import ProfilePage from './ProfilePage';
import FinanceLedgerSection from './FinanceLedgerSection';
import ReturnsPage from './ReturnsPage';
import ReportsDashboardSection from './ReportsDashboardSection';
import SupportPage from './SupportPage';
import NotificationsPage from './NotificationsPage';
import CategoryPage from './CategoryPage';
import InvoicesPage from './InvoicesPage';
import DealerLedgerPage from './DealerLedgerPage';
import OrderHistoryPage from './OrderHistoryPage';

// ─── Design Tokens — Sri Chakra Industries Brand ─────────────────────────────
const C = {
  // Brand — Sri Chakra Industries
  primary:      '#C8102E',   // Chakra Red (logo primary)
  primaryDark:  '#A0001C',   // Chakra Dark Red (logo secondary)
  primaryLight: '#FDEAED',   // Soft red tint for backgrounds
  primaryMid:   '#E8112D',   // Mid red for accents

  success:      '#2E7D32',
  successLight: '#E8F5E9',
  warning:      '#E65100',
  warningLight: '#FFF3E0',
  danger:       '#B71C1C',
  dangerLight:  '#FFEBEE',
  info:         '#1565C0',
  infoLight:    '#E3F0FF',
  purple:       '#6A1B9A',
  purpleLight:  '#F3E5F5',
  teal:         '#00695C',
  tealLight:    '#E0F2F1',

  bg:           '#F5F7FA',
  card:         '#FFFFFF',
  border:       '#E2E8F0',
  text:         '#1A2332',
  textSub:      '#4A5568',
  muted:        '#718096',
};

// ─── Nav Items ────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  {id: 'home',     label: 'Home',    icon: 'home'},
  {id: 'orders',   label: 'Orders',  icon: 'clipboard-text-outline'},
  {id: 'dispatch', label: 'Track',   icon: 'truck-delivery-outline'},
  {id: 'returns',  label: 'Returns', icon: 'package-variant'},
  {id: 'profile',  label: 'Profile', icon: 'account-outline'},
];

// ─── Root Component ────────────────────────────────────────────────────────────
function DealerDashboard({onLogout, activePage: externalActivePage, onPageChange, dealer}) {
  const [activeTab, setActiveTab] = useState('home');
  const [activePage, setActivePage] = useState(externalActivePage || 'home');
  // Order ID + full order data to pass to Dispatch & Tracking from My Orders
  const [dispatchOrderId,   setDispatchOrderId]   = useState(null);
  const [dispatchOrderData, setDispatchOrderData] = useState(null);

  React.useEffect(() => {
    if (externalActivePage) {
      setActivePage(externalActivePage);
      if (NAV_ITEMS.map(n => n.id).includes(externalActivePage)) {
        setActiveTab(externalActivePage);
      }
    }
  }, [externalActivePage]);

  const handleNavigate = page => {
    setActivePage(page);
    if (onPageChange) onPageChange(page);
    if (NAV_ITEMS.map(n => n.id).includes(page)) setActiveTab(page);
  };

  // Called from OrdersPage "Track Order" button — go to dispatch page with that order highlighted
  const handleTrackOrder = (orderId, order) => {
    setDispatchOrderId(orderId || null);
    setDispatchOrderData(order || null);
    setActivePage('dispatch');
    setActiveTab('dispatch');
    if (onPageChange) onPageChange('dispatch');
  };

  const isSubPage = activePage !== 'home';
  const handleBackToHome = () => handleNavigate('home');

  if (isSubPage) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <View style={styles.subPageContainer}>
          {activePage === 'orders'        && <OrdersPage onBack={handleBackToHome} onNavigateToDispatch={handleTrackOrder} onViewInvoice={() => handleNavigate('invoices')} dealer={dealer} />}
          {activePage === 'orderhistory'  && <OrderHistoryPage onBack={handleBackToHome} onNavigateToDispatch={handleTrackOrder} />}
          {activePage === 'inventory'     && <InventoryPage onBack={handleBackToHome} />}
          {activePage === 'dispatch'      && <DispatchTrackingPage onBack={() => { setDispatchOrderId(null); setDispatchOrderData(null); handleBackToHome(); }} initialOrderId={dispatchOrderId} initialOrder={dispatchOrderData} />}
          {activePage === 'profile'       && <ProfilePage dealer={dealer} onLogout={onLogout} onBack={handleBackToHome} onNavigate={handleNavigate} />}
          {activePage === 'ledger'        && <DealerLedgerPage onBack={handleBackToHome} />}
          {activePage === 'returns'       && <ReturnsPage onBack={handleBackToHome} />}
          {activePage === 'reports'       && <ReportsDashboardSection onBack={handleBackToHome} />}
          {activePage === 'support'       && <SupportPage onBack={handleBackToHome} />}
          {activePage === 'notifications' && <NotificationsPage onBack={handleBackToHome} />}
          {activePage === 'category'      && <CategoryPage onBack={handleBackToHome} onCartPress={() => handleNavigate('cart')} />}
          {activePage === 'cart'          && <CartScreen onBack={() => handleNavigate('category')} onCheckout={(cart, grand, sub, gst) => { setCartData({ cart, grand, sub, gst }); handleNavigate('checkout'); }} />}
          {activePage === 'checkout'      && cartData && <CheckoutScreen cart={cartData.cart} grandTotal={cartData.grand} subTotal={cartData.sub} totalGst={cartData.gst} onBack={(target) => handleNavigate(target || 'cart')} onOrderSuccess={() => handleNavigate('orders')} onOrderFail={() => {}} />}
          {activePage === 'invoices'      && <InvoicesPage onBack={handleBackToHome} />}

        </View>
        <BottomNavigation activeTab={activeTab} onChange={tab => {
          // Track tab directly tapped → clear any "from My Orders" order so List Mode shows
          if (tab === 'dispatch') {
            setDispatchOrderId(null);
            setDispatchOrderData(null);
          }
          setActiveTab(tab);
          handleNavigate(tab);
        }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollBody}>
        <HomePage onNavigate={handleNavigate} onLogout={onLogout} />
      </ScrollView>
      <BottomNavigation activeTab={activeTab} onChange={tab => {
        setActiveTab(tab);
        handleNavigate(tab);
      }} />
    </SafeAreaView>
  );
}

// ─── Home Page ─────────────────────────────────────────────────────────────────
import dealerService from './services/dealerService';

function HomePage({onNavigate}) {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await dealerService.getDashboard();
      if (response.success) setDashboardData(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const dealer         = dashboardData?.dealer        || {};
  const stats          = dashboardData?.stats         || {};
  const recentOrders   = dashboardData?.recentOrders  || [];

  const dealerName     = dealer.name            || 'Dealer';
  const dealerCode     = dealer.dealerCode      || 'N/A';

  const totalOrders      = stats.totalOrders              || 0;
  const pendingApproval  = stats.pendingApproval || stats.pendingOrders || 0;
  const approved         = stats.approved                 || 0;
  const processing       = stats.processing               || 0;
  const dispatched       = stats.dispatched               || 0;
  const delivered        = stats.deliveredOrders || stats.delivered || 0;
  const monthOrders      = stats.monthOrders              || 0;
  const monthlyValue     = stats.monthlyPurchaseAmount    || 0;
  const totalValue       = stats.totalPurchaseValue       || 0;
  const avgOrder         = stats.avgOrderValue            || 0;
  const monthGrowth      = stats.monthGrowth              || 0;
  const pendingInvoices  = stats.pendingInvoices          || 0;
  const availableCredit  = dealer.availableCredit         || stats.availableCredit || 0;
  const creditLimit      = dealer.creditLimit             || stats.creditLimit || 0;
  const usedCredit       = dealer.usedCredit              || stats.usedCredit || 0;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.loadingText}>Loading dashboard…</Text>
      </View>
    );
  }

  // ── Quick Actions ──
  const quickActions = [
    {id: 'orders',        label: 'My Orders',      icon: 'clipboard-list',    nav: 'orders',        color: C.success,     bg: C.successLight},
    {id: 'orderhistory',  label: 'Order History',  icon: 'history',           nav: 'orderhistory',  color: C.purple,      bg: C.purpleLight},
    {id: 'tracking',      label: 'Track Orders',   icon: 'truck-delivery',    nav: 'dispatch',      color: C.info,        bg: C.infoLight},
    {id: 'ledger',        label: 'Ledger',         icon: 'book-open-variant', nav: 'ledger',        color: C.warning,     bg: C.warningLight},
    {id: 'returns',       label: 'Returns',        icon: 'package-variant',   nav: 'returns',       color: C.teal,        bg: C.tealLight},
  ];

  return (
    <>
      {/* ══════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════ */}
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <View style={styles.headerLeft}>
            <View style={styles.companyBadge}>
              <Icon name="factory" size={14} color={C.primary} />
              <Text style={styles.companyBadgeText}>Sri Chakra Industries</Text>
            </View>
            <Text style={styles.welcomeText}>Welcome, {dealerName}</Text>
            <View style={styles.dealerMetaRow}>
              <View style={styles.dealerMetaChip}>
                <Icon name="identifier" size={11} color={C.primary} />
                <Text style={styles.dealerMetaChipText}>{dealerCode}</Text>
              </View>
            </View>
          </View>
          <Pressable style={styles.notifBtn} onPress={() => onNavigate('notifications')}>
            <Icon name="bell-outline" size={22} color={C.primary} />
            <View style={styles.notifDot} />
          </Pressable>        </View>
      </View>

      {/* ══════════════════════════════════════════
          STATS GRAPHIC BANNER
      ══════════════════════════════════════════ */}
      <DashboardGraphic
        totalOrders={totalOrders}
        delivered={delivered}
        dispatched={dispatched}
        monthlyValue={monthlyValue}
        monthGrowth={monthGrowth}
        monthOrders={monthOrders}
      />

      {/* ══════════════════════════════════════════
          DASHBOARD SUMMARY CARDS (3-per-row grid)
      ══════════════════════════════════════════ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dashboard Summary</Text>
        <View style={styles.summaryGrid}>
          <SummaryCard label="Total Orders"  value={totalOrders}     icon="receipt"           iconBg={C.primaryLight} iconColor={C.primary}  />
          <SummaryCard label="Pending"       value={pendingApproval} icon="clock-outline"     iconBg={C.warningLight} iconColor={C.warning}  />
          <SummaryCard label="Approved"      value={approved}        icon="check-decagram"    iconBg={C.successLight} iconColor={C.success}  />
          <SummaryCard label="Processing"    value={processing}      icon="progress-clock"    iconBg={C.infoLight}    iconColor={C.info}     />
          <SummaryCard label="Dispatched"    value={dispatched}      icon="truck-delivery"    iconBg={C.purpleLight}  iconColor={C.purple}   />
          <SummaryCard label="Delivered"     value={delivered}       icon="home-map-marker"   iconBg={C.tealLight}    iconColor={C.teal}     />
        </View>
      </View>

      {/* ══════════════════════════════════════════
          QUICK ACTIONS
      ══════════════════════════════════════════ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        {/* Row 1 — My Orders + Order History (wide, side by side) */}
        <View style={styles.qaRow}>
          {quickActions.slice(0, 2).map(item => (
            <Pressable
              key={item.id}
              style={styles.qaItemWide}
              onPress={() => onNavigate(item.nav)}>
              <View style={[styles.qaIconWrap, {backgroundColor: item.bg}]}>
                <Icon name={item.icon} size={26} color={item.color} />
              </View>
              <Text style={styles.qaLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
        {/* Row 2 — Track Orders, Ledger, Returns */}
        <View style={styles.qaRow}>
          {quickActions.slice(2, 5).map(item => (
            <Pressable
              key={item.id}
              style={styles.qaItem}
              onPress={() => onNavigate(item.nav)}>
              <View style={[styles.qaIconWrap, {backgroundColor: item.bg}]}>
                <Icon name={item.icon} size={22} color={item.color} />
              </View>
              <Text style={styles.qaLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>



      <View style={{height: 100}} />
    </>
  );
}

// ─── DashboardGraphic ─────────────────────────────────────────────────────────
function DashboardGraphic({totalOrders, delivered, dispatched, monthlyValue, monthGrowth, monthOrders}) {
  const W = SCREEN_W - 32;
  const H = 138;

  // Bar chart data — 5 weekly bars with real total as peak
  const barH   = H - 44;
  const bars   = [0.45, 0.65, 0.50, 0.80, 1.0].map((r, i) => ({
    h:   Math.round(r * barH * 0.75),
    x:   W * 0.38 + i * 32,
    key: i,
    active: i === 4,
  }));

  return (
    <View style={styles.graphicWrap}>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          {/* Main card gradient */}
          <LinearGradient id="cardGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%"   stopColor="#C8102E" stopOpacity="1" />
            <Stop offset="100%" stopColor="#6A0016" stopOpacity="1" />
          </LinearGradient>
          {/* Bar active gradient */}
          <LinearGradient id="barActive" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.95" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.60" />
          </LinearGradient>
          {/* Bar inactive gradient */}
          <LinearGradient id="barInactive" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.35" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.15" />
          </LinearGradient>
        </Defs>

        {/* Card background — flush with header on top, rounded bottom via wrapper */}
        <Rect x={0} y={0} width={W} height={H} rx={18} fill="url(#cardGrad)" />

        {/* Decorative circles — top-right */}
        <Circle cx={W - 10} cy={-10}  r={55} fill="#FFFFFF" fillOpacity={0.05} />
        <Circle cx={W - 30} cy={10}   r={30} fill="#FFFFFF" fillOpacity={0.06} />
        <Circle cx={W + 5}  cy={H/2}  r={40} fill="#FFFFFF" fillOpacity={0.04} />

        {/* Decorative arc — bottom-left */}
        <Circle cx={-5} cy={H + 5} r={65} fill="none" stroke="#FFFFFF" strokeWidth={1.2} strokeOpacity={0.12} />
        <Circle cx={-5} cy={H + 5} r={45} fill="none" stroke="#FFFFFF" strokeWidth={1}   strokeOpacity={0.08} />

        {/* ── Left side: stats text ── */}
        {/* Label: Total Orders */}
        <G>
          <Rect x={16} y={18} width={90} height={18} rx={9} fill="#FFFFFF" fillOpacity={0.15} />
        </G>

        {/* SVG text: label */}
        {/* (We use View overlay below for proper text rendering) */}

        {/* Bar chart — right side */}
        {bars.map(b => (
          <G key={b.key}>
            <Rect
              x={b.x}
              y={H - 24 - b.h}
              width={18}
              height={b.h}
              rx={5}
              fill={b.active ? 'url(#barActive)' : 'url(#barInactive)'}
            />
            {/* Bar top dot for active */}
            {b.active && (
              <Circle cx={b.x + 9} cy={H - 24 - b.h - 5} r={4} fill="#FFFFFF" fillOpacity={0.9} />
            )}
          </G>
        ))}

        {/* Bar baseline */}
        <Rect x={W * 0.36} y={H - 24} width={W * 0.60} height={1.5} rx={1} fill="#FFFFFF" fillOpacity={0.18} />

        {/* Trend line over bars */}
        <Path
          d={`M${bars[0].x+9},${H-24-bars[0].h}
              C${bars[0].x+20},${H-24-bars[0].h}
               ${bars[1].x-8},${H-24-bars[1].h}
               ${bars[1].x+9},${H-24-bars[1].h}
              C${bars[1].x+22},${H-24-bars[1].h}
               ${bars[2].x-8},${H-24-bars[2].h}
               ${bars[2].x+9},${H-24-bars[2].h}
              C${bars[2].x+22},${H-24-bars[2].h}
               ${bars[3].x-8},${H-24-bars[3].h}
               ${bars[3].x+9},${H-24-bars[3].h}
              C${bars[3].x+22},${H-24-bars[3].h}
               ${bars[4].x-8},${H-24-bars[4].h}
               ${bars[4].x+9},${H-24-bars[4].h}`}
          stroke="#FFFFFF"
          strokeWidth={1.8}
          strokeOpacity={0.5}
          fill="none"
          strokeDasharray="3,3"
        />
      </Svg>

      {/* Text overlay (React Native text renders better than SVG text on Android) */}
      <View style={styles.graphicOverlay} pointerEvents="none">
        {/* Badge */}
        <View style={styles.graphicBadge}>
          <Icon name="chart-bar" size={11} color="#FFFFFF" />
          <Text style={styles.graphicBadgeText}>Live Overview</Text>
        </View>

        {/* Main metric */}
        <Text style={styles.graphicBigNum}>{totalOrders}</Text>
        <Text style={styles.graphicBigLabel}>Total Orders</Text>

        {/* Two sub-stats */}
        <View style={styles.graphicSubRow}>
          <View style={styles.graphicStat}>
            <View style={[styles.graphicDot, {backgroundColor: '#4ADE80'}]} />
            <Text style={styles.graphicStatText}>{delivered} Delivered</Text>
          </View>
          <View style={styles.graphicStat}>
            <View style={[styles.graphicDot, {backgroundColor: '#FBBF24'}]} />
            <Text style={styles.graphicStatText}>{dispatched} Dispatched</Text>
          </View>
          {monthOrders > 0 && (
            <View style={styles.graphicStat}>
              <View style={[styles.graphicDot, {backgroundColor: '#60A5FA'}]} />
              <Text style={styles.graphicStatText}>{monthOrders} This Month</Text>
            </View>
          )}
        </View>

        {/* Monthly value + growth pill */}
        <View style={styles.graphicPillWrap}>
          {monthlyValue > 0 && (
            <Text style={[styles.graphicPillLabel, {fontSize: 11, fontWeight: '700', marginBottom: 2}]}>
              ₹{monthlyValue >= 100000
                ? (monthlyValue / 100000).toFixed(1) + 'L'
                : (monthlyValue / 1000).toFixed(1) + 'K'} this month
              {monthGrowth !== 0 ? (monthGrowth >= 0 ? ` ↑${monthGrowth}%` : ` ↓${Math.abs(monthGrowth)}%`) : ''}
            </Text>
          )}
          {totalOrders > 0 && (
            <>
              <View style={styles.graphicPillTrack}>
                <View style={[styles.graphicPillFill, {
                  width: `${Math.min(Math.round(((delivered + dispatched) / totalOrders) * 100), 100)}%`
                }]} />
              </View>
              <Text style={styles.graphicPillLabel}>
                {totalOrders > 0 ? Math.round(((delivered + dispatched) / totalOrders) * 100) : 0}% fulfilled
              </Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── SummaryCard ──────────────────────────────────────────────────────────────
function SummaryCard({label, value, icon, iconBg, iconColor}) {
  return (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryIconWrap, {backgroundColor: iconBg}]}>
        <Icon name={icon} size={20} color={iconColor} />
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

// ─── RecentOrderCard ──────────────────────────────────────────────────────────
function RecentOrderCard({order, onNavigate}) {
  const statusConfig = {
    Delivered:   {color: C.success,   bg: C.successLight},
    Approved:    {color: C.success,   bg: C.successLight},
    Processing:  {color: C.info,      bg: C.infoLight},
    Dispatched:  {color: C.purple,    bg: C.purpleLight},
    Pending:     {color: C.warning,   bg: C.warningLight},
    Cancelled:   {color: C.danger,    bg: C.dangerLight},
    Rejected:    {color: C.danger,    bg: C.dangerLight},
  };
  const cfg = statusConfig[order.status] || {color: C.muted, bg: '#F2F2F2'};
  const fmtDate = d => {
    try {
      return new Date(d).toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'});
    } catch { return d; }
  };
  const fmtAmt = v =>
    v ? `₹${Number(v).toLocaleString('en-IN')}` : '₹0';

  return (
    <View style={styles.orderCard}>
      <View style={styles.orderCardHeader}>
        <View style={styles.orderCardLeft}>
          <Text style={styles.orderNo}>{order.orderId || order.orderNo || 'ORD-XXXX'}</Text>
          <Text style={styles.orderDate}>{fmtDate(order.date)}</Text>
        </View>
        <View style={[styles.statusBadge, {backgroundColor: cfg.bg}]}>
          <Text style={[styles.statusBadgeText, {color: cfg.color}]}>{order.status}</Text>
        </View>
      </View>
      <View style={styles.orderCardDivider} />
      <View style={styles.orderCardFooter}>
        <Text style={styles.orderAmount}>{fmtAmt(order.amount)}</Text>
        <Pressable
          style={styles.viewDetailsBtn}
          onPress={() => onNavigate('orders')}>
          <Text style={styles.viewDetailsBtnText}>View Details</Text>
          <Icon name="arrow-right" size={13} color={C.primary} />
        </Pressable>
      </View>
    </View>
  );
}

// ─── BottomNavigation ─────────────────────────────────────────────────────────
function BottomNavigation({activeTab, onChange}) {
  return (
    <View style={styles.navWrap}>
      <View style={styles.navBar}>
        {NAV_ITEMS.map(item => {
          const isActive = item.id === activeTab;
          return (
            <Pressable
              key={item.id}
              onPress={() => onChange(item.id)}
              style={styles.navItem}>
              <View style={[styles.navIconWrap, isActive && styles.navIconWrapActive]}>
                <Icon
                  name={isActive
                    ? item.icon.replace('-outline', '')
                    : item.icon}
                  size={isActive ? 22 : 21}
                  color={isActive ? '#FFFFFF' : '#AAAAAA'}
                />
              </View>
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: C.primary},
  scroll: {flex: 1, backgroundColor: C.bg},
  scrollBody: {paddingBottom: 80},
  subPageContainer: {flex: 1},

  loadingContainer: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 120},
  loadingText: {marginTop: 12, color: C.muted, fontSize: 14},

  // ── Header ──
  header: {
    backgroundColor: C.primary,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerInner: {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between'},
  headerLeft: {flex: 1, paddingRight: 12},
  companyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
    gap: 5,
  },
  companyBadgeText: {color: '#FFFFFF', fontSize: 11, fontWeight: '700', letterSpacing: 0.3},
  welcomeText: {color: '#FFFFFF', fontSize: 21, fontWeight: '800', letterSpacing: 0.2},
  dealerMetaRow: {flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap'},
  dealerMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
    gap: 4,
  },
  dealerMetaChipText: {color: '#FFFFFF', fontSize: 11, fontWeight: '600'},
  notifBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  notifDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#FF3B30',
    borderWidth: 1.5,
    borderColor: C.primary,
  },

  // ── Sections ──
  section: {paddingHorizontal: 16, marginTop: 20},
  sectionRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12},
  sectionTitle: {color: C.text, fontSize: 16, fontWeight: '800', marginBottom: 12, letterSpacing: 0.1},
  seeAll: {color: C.primary, fontSize: 13, fontWeight: '700'},

  // ── Dashboard Graphic Banner ──
  graphicWrap: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: C.primaryDark,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 5},
    elevation: 7,
  },
  graphicOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingVertical: 14,
    justifyContent: 'flex-start',
  },
  graphicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  graphicBadgeText: {color: '#FFFFFF', fontSize: 10, fontWeight: '700', letterSpacing: 0.4},
  graphicBigNum:   {color: '#FFFFFF', fontSize: 34, fontWeight: '900', lineHeight: 38},
  graphicBigLabel: {color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600', marginTop: 1},
  graphicSubRow:   {flexDirection: 'row', gap: 14, marginTop: 8},
  graphicStat:     {flexDirection: 'row', alignItems: 'center', gap: 5},
  graphicDot:      {width: 7, height: 7, borderRadius: 4},
  graphicStatText: {color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600'},
  graphicPillWrap: {
    position: 'absolute',
    bottom: 14,
    right: 18,
    alignItems: 'flex-end',
    gap: 4,
  },
  graphicPillTrack: {
    width: 100,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.20)',
    overflow: 'hidden',
  },
  graphicPillFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#4ADE80',
  },
  graphicPillLabel: {color: 'rgba(255,255,255,0.70)', fontSize: 10, fontWeight: '600'},

  // ── Summary Cards — 3-per-row ──
  summaryGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  summaryCard: {
    width: '31%',
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    ...shadow,
  },
  summaryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  summaryValue: {color: C.text, fontSize: 22, fontWeight: '900'},
  summaryLabel: {color: C.muted, fontSize: 11, fontWeight: '600', marginTop: 2},

  // ── Financial Overview Strip ──
  financeStrip: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    ...shadow,
  },
  financeCard: {
    flex: 1,
    alignItems: 'center',
  },
  financeDiv: {
    width: 1,
    backgroundColor: C.border,
    marginHorizontal: 8,
  },
  financeVal: {
    fontSize: 15,
    fontWeight: '900',
    color: C.primary,
    textAlign: 'center',
  },
  financeLbl: {
    fontSize: 10,
    fontWeight: '600',
    color: C.muted,
    marginTop: 2,
    textAlign: 'center',
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginTop: 4,
  },
  growthText: {
    fontSize: 9,
    fontWeight: '800',
  },
  creditBarWrap: {
    marginTop: 5,
    alignItems: 'center',
    width: '100%',
  },
  creditBarTrack: {
    width: '90%',
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    overflow: 'hidden',
  },
  creditBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  creditBarLabel: {
    fontSize: 8,
    color: C.muted,
    fontWeight: '600',
    marginTop: 2,
  },

  // ── Quick Actions — 6 tiles (2 + 4 layout) ──
  qaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  qaItemWide: {
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: C.border,
    ...shadow,
  },
  qaItem: {
    flex: 1,
    marginHorizontal: 3,
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: C.border,
    ...shadow,
  },
  qaIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  qaLabel: {
    color: C.textSub,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 5,
    textAlign: 'center',
    paddingHorizontal: 2,
  },

  // ── Order Cards ──
  orderCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 10,
    ...shadow,
  },
  orderCardHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  orderCardLeft: {flex: 1, paddingRight: 10},
  orderNo: {color: C.text, fontSize: 15, fontWeight: '800'},
  orderDate: {color: C.muted, fontSize: 12, marginTop: 2},
  statusBadge: {borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4},
  statusBadgeText: {fontSize: 11, fontWeight: '700'},
  orderCardDivider: {height: 1, backgroundColor: C.border, marginVertical: 10},
  orderCardFooter: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  orderAmount: {color: C.text, fontSize: 16, fontWeight: '900'},
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  viewDetailsBtnText: {color: C.primary, fontSize: 12, fontWeight: '700'},
  // ── Empty State ──
  emptyState: {alignItems: 'center', paddingVertical: 30},
  emptyStateText: {color: C.muted, fontSize: 14, marginTop: 8},

  // ── Bottom Nav — floating curved pill ──
  navWrap: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 8,
    backgroundColor: 'transparent',
  },
  navBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    paddingVertical: 8,
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOpacity: 0.13,
    shadowRadius: 18,
    shadowOffset: {width: 0, height: 4},
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  navIconWrap: {
    width: 42,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconWrapActive: {
    backgroundColor: C.primary,
    width: 48,
    height: 36,
    borderRadius: 18,
    shadowColor: C.primary,
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 3},
    elevation: 5,
  },
  navLabel: {color: '#AAAAAA', fontSize: 10, fontWeight: '600'},
  navLabelActive: {color: C.primary, fontWeight: '800'},
  navUnderline: {},
});

export default DealerDashboard;
