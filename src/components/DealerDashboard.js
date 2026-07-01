import React, {useState, useEffect} from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {colors, shadow} from './theme';
import OrdersPage from './OrdersPage';
import InventoryPage from './InventoryPage';
import DispatchTrackingPage from './DispatchTrackingPage';
import ProfilePage from './ProfilePage';
import FinanceLedgerSection from './FinanceLedgerSection';
import ReturnsComplaintsSection from './ReturnsComplaintsSection';
import ReportsDashboardSection from './ReportsDashboardSection';
import SupportPage from './SupportPage';
import NotificationsPage from './NotificationsPage';
import CategoryPage from './CategoryPage';
import InvoicesPage from './InvoicesPage';
import PlaceOrderPage from './PlaceOrderPage';

// ─── Additional Dashboard Colors ────────────────────────────────────────────
const dashColors = {
  ...colors,
  green: '#1A7A3C',
  greenLight: '#E8F5ED',
  danger: '#C0392B',
  amber: '#B86A00',
  amberLight: '#FEF3E2',
};

// ─── Nav Items ────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  {id: 'home', label: 'Home', icon: 'home'},
  {id: 'orders', label: 'Orders', icon: 'clipboard-text'},
  {id: 'inventory', label: 'Stock', icon: 'package-variant'},
  {id: 'dispatch', label: 'Track', icon: 'truck-delivery'},
  {id: 'profile', label: 'Profile', icon: 'account'},
];

// ─── Root Component ────────────────────────────────────────────────────────────
function DealerDashboard({onLogout, activePage: externalActivePage, onPageChange}) {
  const [activeTab, setActiveTab] = useState('home');
  const [activePage, setActivePage] = useState(externalActivePage || 'home');

  // Sync with external page changes
  React.useEffect(() => {
    if (externalActivePage) {
      setActivePage(externalActivePage);
      if (['home', 'orders', 'inventory', 'dispatch', 'profile'].includes(externalActivePage)) {
        setActiveTab(externalActivePage);
      }
    }
  }, [externalActivePage]);

  const handleNavigate = (page) => {
    setActivePage(page);
    if (onPageChange) {
      onPageChange(page);
    }
    if (['home', 'orders', 'inventory', 'dispatch', 'profile'].includes(page)) {
      setActiveTab(page);
    }
  };

  // Sub-pages that manage their own scrolling — render them at full flex: 1
  const isSubPage = !['home'].includes(activePage);

  const handleBackToHome = () => {
    handleNavigate('home');
  };

  if (isSubPage) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.subPageContainer}>
          {activePage === 'orders' && <OrdersPage onBack={handleBackToHome} />}
          {activePage === 'inventory' && <InventoryPage onBack={handleBackToHome} />}
          {activePage === 'dispatch' && <DispatchTrackingPage onBack={handleBackToHome} />}
          {activePage === 'profile' && <ProfilePage onLogout={onLogout} onBack={handleBackToHome} />}
          {activePage === 'ledger' && <FinanceLedgerSection onBack={handleBackToHome} />}
          {activePage === 'returns' && <ReturnsComplaintsSection onBack={handleBackToHome} />}
          {activePage === 'reports' && <ReportsDashboardSection onBack={handleBackToHome} />}
          {activePage === 'support' && <SupportPage onBack={handleBackToHome} />}
          {activePage === 'notifications' && <NotificationsPage onBack={handleBackToHome} />}
          {activePage === 'category' && <CategoryPage onBack={handleBackToHome} />}
          {activePage === 'invoices' && <InvoicesPage onBack={handleBackToHome} />}
          {activePage === 'placeorder' && <PlaceOrderPage onBack={handleBackToHome} />}
        </View>
        <BottomNavigation activeTab={activeTab} onChange={(tab) => {
          setActiveTab(tab);
          handleNavigate(tab);
        }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollBody}>
        <HomePage onNavigate={handleNavigate} onLogout={onLogout} />
      </ScrollView>
      <BottomNavigation activeTab={activeTab} onChange={(tab) => {
        setActiveTab(tab);
        handleNavigate(tab);
      }} />
    </SafeAreaView>
  );
}

// ─── Home Page ─────────────────────────────────────────────────────────────────
import dealerService from './services/dealerService';

// Helper function to get greeting
function getGreeting() {
  return 'Namaste';
}

function HomePage({onNavigate, onLogout}) {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const greeting = getGreeting();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await dealerService.getDashboard();
      if (response.success) {
        setDashboardData(response.data);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load dashboard data');
      console.error('Dashboard Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Extract data with fallbacks
  const dealer = dashboardData?.dealer || {};
  const stats = dashboardData?.stats || {};
  const dealerName = dealer.name || 'Dealer';
  const dealerCode = dealer.dealerCode || 'N/A';
  const zone = dealer.zone || 'Zone';
  const usedCredit = dealer.usedCredit || 0;
  const creditLimit = dealer.creditLimit || 0;
  const availableCredit = dealer.availableCredit || 0;
  const usedPercentage = creditLimit > 0 ? Math.round((usedCredit / creditLimit) * 100) : 0;
  const totalOrders = stats.totalOrders || 0;
  const monthOrders = stats.monthOrders || 0;
  const pendingOrders = stats.pendingOrders || 0;
  const deliveredOrders = stats.deliveredOrders || 0;
  const monthlyPurchase = stats.monthlyPurchaseAmount || 0;
  const pendingInvoices = stats.pendingInvoices || 0;
  const outstandingAmount = dashboardData?.dealer?.outstandingAmount || 0;
  const recentOrders = dashboardData?.recentOrders || [];

  if (loading) {
    return (
      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 100}}>
        <ActivityIndicator size="large" color={dashColors.red} />
        <Text style={{marginTop: 12, color: dashColors.muted}}>Loading dashboard...</Text>
      </View>
    );
  }

  const quickActions = [
    {id: 'placeorder', label: 'Place Order', icon: 'cart-plus', nav: 'placeorder'},
    {id: 'orders', label: 'Orders', icon: 'clipboard-text', nav: 'orders'},
    {id: 'category', label: 'Category', icon: 'view-grid', nav: 'category'},
    {id: 'inventory', label: 'Inventory', icon: 'package-variant', nav: 'inventory'},
    {id: 'tracking', label: 'Tracking', icon: 'truck-delivery', nav: 'dispatch'},
    {id: 'ledger', label: 'Ledger', icon: 'book-open', nav: 'ledger'},
    {id: 'invoices', label: 'Invoices', icon: 'file-document', nav: 'invoices'},
    {id: 'returns', label: 'Returns', icon: 'keyboard-return', nav: 'returns'},
    {id: 'reports', label: 'Reports', icon: 'chart-bar', nav: 'reports'},
    {id: 'support', label: 'Support', icon: 'headset', nav: 'support'},
  ];

  const topProducts = [
    {id: 1, name: 'Coconut Oil 1L', sku: 'CO-1000', stock: 245, price: '₹450', image: '🥥'},
    {id: 2, name: 'Sesame Oil 500ml', sku: 'SO-500', stock: 180, price: '₹280', image: '🌾'},
    {id: 3, name: 'Groundnut Oil 1L', sku: 'GO-1000', stock: 156, price: '₹380', image: '🥜'},
    {id: 4, name: 'Mustard Oil 500ml', sku: 'MO-500', stock: 98, price: '₹220', image: '🌿'},
  ];

  return (
    <>
      {/* ── Red Header ── */}
      <View style={styles.redHeader}>
        {/* Top row */}
        <View style={styles.redHeaderTop}>
          <View>
            <Text style={styles.greetingName}>{greeting}, {dealerName}</Text>
            <Text style={styles.greetingMeta}>{dealerCode}  ·  {zone}</Text>
          </View>
          <Pressable style={styles.iconBtn} onPress={() => onNavigate('notifications')}>
            <Icon name="bell" size={20} color="#FFFFFF" />
            <View style={styles.notifDot} />
          </Pressable>
        </View>

        {/* ── Credit Card Widget ── */}
        <View style={styles.creditCard}>
          <View style={styles.creditCardInner}>
            <View style={styles.creditLeft}>
              <Text style={styles.creditKicker}>CREDIT LIMIT USED</Text>
              <Text style={styles.creditAmount}>₹{(usedCredit / 1000).toFixed(1)}K</Text>
              <Text style={styles.creditSub}>of ₹{(creditLimit / 1000).toFixed(1)}K total limit</Text>

              {/* Progress bar */}
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, {width: `${usedPercentage}%`}]} />
              </View>

              <View style={styles.dueLine}>
                <Text style={styles.dueLabel}>Available credit</Text>
                <Text style={styles.dueDate}>₹{(availableCredit / 1000).toFixed(1)}K</Text>
              </View>
            </View>

            <View style={styles.usedBadge}>
              <Text style={styles.usedPct}>{usedPercentage}%</Text>
              <Text style={styles.usedWord}>used</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── Metrics Grid ── */}
      <View style={styles.metricsGrid}>
        <MetricCard 
          value={String(totalOrders || 0)} 
          label="Total Orders" 
          sub={`${monthOrders} this month`} 
          subColor={dashColors.muted} 
        />
        <MetricCard 
          value={monthlyPurchase > 0 ? `₹${(monthlyPurchase / 1000).toFixed(1)}K` : '₹0'} 
          label="Purchases (MTD)" 
          sub="Month to date" 
          subColor={dashColors.green} 
        />
        <MetricCard 
          value={String(pendingOrders || 0)} 
          label="Pending orders" 
          sub={pendingOrders > 0 ? "● Action needed" : "All clear"} 
          subColor={pendingOrders > 0 ? dashColors.red : dashColors.green} 
        />
        <MetricCard 
          value={String(deliveredOrders || 0)} 
          label="Delivered orders" 
          sub="Orders fulfilled" 
          subColor={dashColors.green} 
        />
        <MetricCard 
          value={outstandingAmount > 0 ? `₹${(outstandingAmount / 1000).toFixed(1)}K` : '₹0'} 
          label="Outstanding" 
          sub={outstandingAmount > 0 ? "Awaiting payment" : "No dues"} 
          subColor={outstandingAmount > 0 ? dashColors.red : dashColors.green} 
        />
      </View>

      {/* ── Quick Actions ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.qaGrid}>
          {quickActions.map(item => (
            <Pressable 
              key={item.id} 
              style={styles.qaItem}
              onPress={() => onNavigate && onNavigate(item.nav)}>
              <View style={[styles.qaIcon, item.primary && styles.qaIconPrimary]}>
                <Icon name={item.icon} size={24} color={dashColors.red} />
              </View>
              <Text style={styles.qaLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* ── Recent Orders ── */}
      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Recent orders</Text>
          <Pressable onPress={() => onNavigate('orders')}>
            <Text style={styles.seeAll}>See all →</Text>
          </Pressable>
        </View>

        {recentOrders.length === 0 ? (
          <Text style={{textAlign: 'center', color: dashColors.muted, marginTop: 10}}>No recent orders</Text>
        ) : (
          recentOrders.map(order => (
            <OrderCard
              key={order.orderId}
              code={order.orderId}
              time={new Date(order.date).toLocaleDateString('en-IN', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'})}
              desc={`Amount: ₹${Number(order.amount).toLocaleString('en-IN')}`}
              amount={`₹${Number(order.amount).toLocaleString('en-IN')}`}
              status={order.status}
              statusColor={
                order.status === 'Delivered' ? dashColors.green :
                order.status === 'Cancelled' ? dashColors.red :
                order.status === 'Pending' ? dashColors.amber : dashColors.red
              }
              statusBg={
                order.status === 'Delivered' ? dashColors.greenLight :
                order.status === 'Cancelled' ? '#FFF5F5' :
                order.status === 'Pending' ? dashColors.amberLight : 'rgba(198, 40, 40, 0.1)'
              }
              action={order.status === 'Shipped' || order.status === 'In Transit' ? '🚚 Track' : '📄 View'}
              actionColor={dashColors.red}
              onPress={() => onNavigate('orders')}
            />
          ))
        )}
      </View>

      {/* Bottom padding for nav */}
      <View style={{height: 100}} />
    </>
  );
}

// ─── Other Pages ──────────────────────────────────────────────────────────────
// Removed - now using separate page components

// ─── Shared Components ────────────────────────────────────────────────────────
function MetricCard({value, label, sub, subColor}) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricSub, {color: subColor}]}>{sub}</Text>
    </View>
  );
}

function OrderCard({code, time, desc, amount, status, statusColor, statusBg, action, actionColor, onPress}) {
  return (
    <Pressable style={styles.orderCard} onPress={onPress}>
      <View style={styles.orderTop}>
        <Text style={styles.orderCode}>{code}</Text>
        <View style={[styles.statusPill, {backgroundColor: statusBg}]}>
          <Text style={[styles.statusText, {color: statusColor}]}>{status}</Text>
        </View>
      </View>
      <Text style={styles.orderTime}>{time}</Text>
      <View style={styles.orderDivider} />
      <View style={styles.orderBottom}>
        <View>
          <Text style={styles.orderDesc}>{desc}</Text>
          <Text style={styles.orderAmount}>{amount}</Text>
        </View>
        <Pressable>
          <Text style={[styles.orderAction, {color: actionColor}]}>{action}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

function BottomNavigation({activeTab, onChange}) {
  return (
    <View style={styles.navBar}>
      {NAV_ITEMS.map(item => {
        const isActive = item.id === activeTab;
        return (
          <Pressable
            key={item.id}
            onPress={() => onChange(item.id)}
            style={styles.navItem}>
            <Icon 
              name={item.icon} 
              size={24} 
              color={isActive ? dashColors.red : '#6B7C8A'} 
            />
            <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
              {item.label}
            </Text>
            {isActive && <View style={styles.navActiveBar} />}
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  scrollBody: {
    paddingBottom: 80,
  },
  subPageContainer: {
    flex: 1,
  },

  // ── Red Header ──
  redHeader: {
    backgroundColor: dashColors.red,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 20,
    marginBottom: 16,
  },
  redHeaderTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  greetingName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  greetingMeta: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    marginTop: 2,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFD700',
    borderWidth: 1,
    borderColor: dashColors.red,
  },

  // ── Credit Card ──
  creditCard: {
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 18,
    padding: 16,
  },
  creditCardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  creditLeft: {
    flex: 1,
    paddingRight: 12,
  },
  creditKicker: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  creditAmount: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    marginTop: 4,
  },
  creditSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  dueLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  dueLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
  },
  dueDate: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  usedBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 58,
  },
  usedPct: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  usedWord: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    fontWeight: '700',
  },

  // ── Metrics ──
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  metricCard: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: dashColors.line,
    ...shadow,
  },
  metricValue: {
    color: dashColors.text,
    fontSize: 26,
    fontWeight: '900',
  },
  metricLabel: {
    color: dashColors.muted,
    fontSize: 12,
    marginTop: 4,
  },
  metricSub: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
  },

  // ── Section ──
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: dashColors.text,
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 12,
  },
  seeAll: {
    color: dashColors.red,
    fontSize: 13,
    fontWeight: '700',
  },

  // ── Quick Actions ──
  qaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-start',
  },
  qaItem: {
    width: '23%',
    alignItems: 'center',
    marginBottom: 6,
  },
  qaIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: dashColors.line,
    ...shadow,
  },
  qaIconPrimary: {
    backgroundColor: dashColors.red,
    borderColor: dashColors.red,
  },
  qaLabel: {
    color: dashColors.text,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },

  // ── Alert Banner ──
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: dashColors.amberLight,
    borderWidth: 1,
    borderColor: '#F0D090',
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
  alertBody: {
    flex: 1,
  },
  alertTitle: {
    color: dashColors.amber,
    fontSize: 14,
    fontWeight: '800',
  },
  alertMeta: {
    color: dashColors.amber,
    fontSize: 12,
    marginTop: 2,
  },

  // ── Order Cards ──
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: dashColors.line,
    padding: 14,
    marginBottom: 10,
    ...shadow,
  },
  orderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderCode: {
    color: dashColors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  statusPill: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  orderTime: {
    color: dashColors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  orderDivider: {
    height: 1,
    backgroundColor: dashColors.line,
    marginVertical: 10,
  },
  orderBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  orderDesc: {
    color: dashColors.muted,
    fontSize: 12,
  },
  orderAmount: {
    color: dashColors.text,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  orderAction: {
    fontSize: 13,
    fontWeight: '800',
  },

  // ── Bottom Nav ──
  navBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: dashColors.line,
    paddingBottom: 20,
    paddingTop: 10,
    paddingHorizontal: 6,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  navLabel: {
    color: dashColors.muted,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
  },
  navLabelActive: {
    color: dashColors.red,
    fontWeight: '900',
  },
  navActiveBar: {
    position: 'absolute',
    bottom: -10,
    width: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: dashColors.red,
  },
});

export default DealerDashboard;