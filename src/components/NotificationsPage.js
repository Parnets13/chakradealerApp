import React, {useState, useEffect} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator, RefreshControl, Alert} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, shadow} from './theme';
import dealerService from './services/dealerService';

function NotificationsPage({onBack}) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/dealer/notifications');
      if (response.data.success) {
        setNotifications(response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      // Fallback to static data if API fails
      setNotifications([
        {id: 1, type: 'order', title: 'Order Dispatched', desc: 'Your order ORD-2026-4821 has been dispatched', time: '2 hours ago', read: false, createdAt: new Date()},
        {id: 2, type: 'payment', title: 'Payment Due', desc: 'Payment of ₹2,45,000 is due in 12 days', time: '5 hours ago', read: false, createdAt: new Date()},
        {id: 3, type: 'offer', title: 'Special Offer', desc: '20% off on bulk orders this week', time: '1 day ago', read: true, createdAt: new Date()},
        {id: 4, type: 'order', title: 'Order Delivered', desc: 'Order ORD-2026-4790 delivered successfully', time: '2 days ago', read: true, createdAt: new Date()},
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/dealer/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? {...n, read: true} : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/dealer/notifications/read-all');
      setNotifications(prev => prev.map(n => ({...n, read: true})));
      Alert.alert('Success', 'All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const formatTime = (time) => {
    if (typeof time === 'string' && time.includes('ago')) {
      return time;
    }
    try {
      const date = new Date(time);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      return date.toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'});
    } catch {
      return time;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type) => {
    switch(type) {
      case 'order':    return 'package-variant';
      case 'payment':  return 'cash';
      case 'offer':    return 'tag';
      case 'dispatch': return 'truck-delivery';
      case 'alert':    return 'alert-circle';
      case 'system':   return 'cog';
      default:         return 'bell';
    }
  };

  const getColor = (type) => {
    switch(type) {
      case 'order':    return '#4CAF50';
      case 'payment':  return '#F44336';
      case 'offer':    return '#FF9800';
      case 'dispatch': return '#4A90E2';
      case 'alert':    return '#FF5722';
      case 'system':   return '#9C27B0';
      default:         return colors.muted;
    }
  };

  const getTypeLabel = (type) => {
    switch(type) {
      case 'order':    return 'Order';
      case 'payment':  return 'Payment';
      case 'offer':    return 'Offer';
      case 'dispatch': return 'Dispatch';
      case 'alert':    return 'Alert';
      case 'system':   return 'System';
      default:         return 'Info';
    }
  };

  // Group notifications by date
  const todayStr = new Date().toDateString();
  const yesterdayStr = new Date(Date.now() - 86400000).toDateString();
  const grouped = notifications.reduce((acc, n) => {
    let groupKey = 'Older';
    try {
      const dateStr = new Date(n.createdAt || new Date()).toDateString();
      if (dateStr === todayStr) groupKey = 'Today';
      else if (dateStr === yesterdayStr) groupKey = 'Yesterday';
    } catch {}
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(n);
    return acc;
  }, {});
  const groupOrder = ['Today', 'Yesterday', 'Older'];

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Pressable onPress={onBack} style={styles.backButton}>
              <Icon name="arrow-left" size={24} color={colors.text} />
            </Pressable>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>Notifications</Text>
            </View>
          </View>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.red} />
          <Text style={styles.loadingText}>Loading notifications…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={colors.text} />
          </Pressable>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>Stay updated with latest alerts</Text>
          </View>
          {unreadCount > 0 && (
            <Pressable onPress={markAllAsRead} style={styles.markAllBtn}>
              <Icon name="check-all" size={16} color={colors.red} />
              <Text style={styles.markAllText}>All read</Text>
            </Pressable>
          )}
        </View>

        {/* Stats bar */}
        <View style={styles.statsBar}>
          <View style={styles.statChip}>
            <View style={[styles.statDot, {backgroundColor: colors.red}]} />
            <Text style={styles.statChipText}>{unreadCount} Unread</Text>
          </View>
          <View style={styles.statChip}>
            <View style={[styles.statDot, {backgroundColor: '#4CAF50'}]} />
            <Text style={styles.statChipText}>{notifications.length} Total</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.red]} />
        }>

        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Icon name="bell-off-outline" size={48} color={colors.muted} />
            </View>
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptySubtitle}>No notifications right now. Pull to refresh.</Text>
          </View>
        ) : (
          groupOrder.map(groupKey => {
            const items = grouped[groupKey];
            if (!items || items.length === 0) return null;
            return (
              <View key={groupKey}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupLabel}>{groupKey}</Text>
                  <View style={styles.groupLine} />
                </View>
                {items.map(notif => (
                  <Pressable
                    key={notif.id}
                    onPress={() => markAsRead(notif.id)}
                    style={[styles.notifCard, !notif.read && styles.notifUnread]}>
                    <View style={[styles.notifIconWrap, {backgroundColor: getColor(notif.type) + '20'}]}>
                      <Icon name={getIcon(notif.type)} size={22} color={getColor(notif.type)} />
                    </View>
                    <View style={styles.notifContent}>
                      <View style={styles.notifTopRow}>
                        <Text style={styles.notifTitle}>{notif.title}</Text>
                        <View style={[styles.typeBadge, {backgroundColor: getColor(notif.type) + '18'}]}>
                          <Text style={[styles.typeBadgeText, {color: getColor(notif.type)}]}>
                            {getTypeLabel(notif.type)}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.notifDesc}>{notif.desc || notif.message}</Text>
                      <Text style={styles.notifTime}>{formatTime(notif.time || notif.createdAt)}</Text>
                    </View>
                    {!notif.read && <View style={styles.unreadDot} />}
                  </Pressable>
                ))}
              </View>
            );
          })
        )}

        <View style={{height: 30}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F5F5F5'},

  // ── Header ──
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerTop: {flexDirection: 'row', alignItems: 'center', gap: 12},
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTextContainer: {flex: 1},
  title: {fontSize: 20, fontWeight: '900', color: colors.text},
  subtitle: {fontSize: 13, color: colors.muted, marginTop: 2},
  markAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(197,31,43,0.08)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
  },
  markAllText: {color: colors.red, fontSize: 12, fontWeight: '700'},

  // ── Stats bar ──
  statsBar: {flexDirection: 'row', gap: 10, marginTop: 12},
  statChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#F5F5F5', paddingHorizontal: 10,
    paddingVertical: 5, borderRadius: 10,
  },
  statDot: {width: 7, height: 7, borderRadius: 4},
  statChipText: {fontSize: 12, fontWeight: '700', color: colors.text},

  // ── Loading / Empty ──
  centerContainer: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24},
  loadingText: {marginTop: 12, color: colors.muted, fontSize: 14},
  emptyState: {alignItems: 'center', justifyContent: 'center', paddingVertical: 70, paddingHorizontal: 30},
  emptyIconWrap: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(197,31,43,0.07)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  emptyTitle: {color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 8},
  emptySubtitle: {color: colors.muted, fontSize: 14, textAlign: 'center', lineHeight: 20},

  // ── Content ──
  content: {paddingHorizontal: 14, paddingTop: 14, paddingBottom: 32},

  // ── Group headers ──
  groupHeader: {flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, marginTop: 6},
  groupLabel: {color: colors.muted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6},
  groupLine: {flex: 1, height: 1, backgroundColor: colors.line},

  // ── Notification card ──
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 10,
    ...shadow,
  },
  notifUnread: {
    borderLeftWidth: 3,
    borderLeftColor: colors.red,
    backgroundColor: '#FFF9F9',
  },
  notifIconWrap: {
    width: 46, height: 46, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  notifContent: {flex: 1},
  notifTopRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4},
  notifTitle: {fontSize: 14, fontWeight: '800', color: colors.text, flex: 1, marginRight: 8},
  typeBadge: {paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6},
  typeBadgeText: {fontSize: 10, fontWeight: '700'},
  notifDesc: {fontSize: 13, color: colors.muted, lineHeight: 18, marginBottom: 5},
  notifTime: {fontSize: 11, color: colors.muted},
  unreadDot: {
    width: 9, height: 9, borderRadius: 5,
    backgroundColor: colors.red,
    marginLeft: 8, marginTop: 4,
  },
});

export default NotificationsPage;
