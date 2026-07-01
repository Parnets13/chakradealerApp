import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, shadow} from './theme';

function NotificationsPage({onBack}) {
  const notifications = [
    {id: 1, type: 'order', title: 'Order Dispatched', desc: 'Your order ORD-2026-4821 has been dispatched', time: '2 hours ago', read: false},
    {id: 2, type: 'payment', title: 'Payment Due', desc: 'Payment of ₹2,45,000 is due in 12 days', time: '5 hours ago', read: false},
    {id: 3, type: 'offer', title: 'Special Offer', desc: '20% off on bulk orders this week', time: '1 day ago', read: true},
    {id: 4, type: 'order', title: 'Order Delivered', desc: 'Order ORD-2026-4790 delivered successfully', time: '2 days ago', read: true},
  ];

  const getIcon = (type) => {
    switch(type) {
      case 'order': return 'package-variant';
      case 'payment': return 'cash';
      case 'offer': return 'tag';
      default: return 'bell';
    }
  };

  const getColor = (type) => {
    switch(type) {
      case 'order': return '#4CAF50';
      case 'payment': return '#F44336';
      case 'offer': return '#FF9800';
      default: return colors.muted;
    }
  };

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
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {notifications.map(notif => (
          <View key={notif.id} style={[styles.notifCard, !notif.read && styles.notifUnread]}>
            <View style={[styles.notifIcon, {backgroundColor: getColor(notif.type) + '20'}]}>
              <Icon name={getIcon(notif.type)} size={24} color={getColor(notif.type)} />
            </View>
            <View style={styles.notifContent}>
              <Text style={styles.notifTitle}>{notif.title}</Text>
              <Text style={styles.notifDesc}>{notif.desc}</Text>
              <Text style={styles.notifTime}>{notif.time}</Text>
            </View>
            {!notif.read && <View style={styles.unreadDot} />}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  content: {
    padding: 16,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 10,
    ...shadow,
  },
  notifUnread: {
    borderLeftWidth: 3,
    borderLeftColor: colors.red,
  },
  notifIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  notifDesc: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
    marginBottom: 4,
  },
  notifTime: {
    fontSize: 11,
    color: colors.muted,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.red,
    marginLeft: 8,
    marginTop: 4,
  },
});

export default NotificationsPage;
