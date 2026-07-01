import React from 'react';
import {Linking, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, shadow} from './theme';

function SupportPage({onBack}) {
  const contactOptions = [
    {id: 1, title: 'Call Support', desc: '+91 1800-123-4567', icon: 'phone', color: '#4CAF50', action: () => Linking.openURL('tel:18001234567')},
    {id: 2, title: 'WhatsApp', desc: 'Chat with us', icon: 'whatsapp', color: '#25D366', action: () => Linking.openURL('https://wa.me/918001234567')},
    {id: 3, title: 'Email Support', desc: 'support@srichakra.com', icon: 'email', color: '#2196F3', action: () => Linking.openURL('mailto:support@srichakra.com')},
    {id: 4, title: 'Help Center', desc: 'FAQs & guides', icon: 'help-circle', color: '#FF9800'},
  ];

  const faqs = [
    {q: 'How to place an order?', a: 'Go to Orders tab, click New Order, select products and submit.'},
    {q: 'How to track my order?', a: 'Go to Track tab and enter your order number.'},
    {q: 'How to request a return?', a: 'Go to Returns section and submit a return request.'},
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={colors.text} />
          </Pressable>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Support & Help</Text>
            <Text style={styles.subtitle}>We're here to help you</Text>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Contact Options */}
        <Text style={styles.sectionTitle}>Contact Us</Text>
        {contactOptions.map(option => (
          <Pressable key={option.id} style={styles.contactCard} onPress={option.action}>
            <View style={[styles.contactIcon, {backgroundColor: option.color + '20'}]}>
              <Icon name={option.icon} size={24} color={option.color} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>{option.title}</Text>
              <Text style={styles.contactDesc}>{option.desc}</Text>
            </View>
            <Icon name="chevron-right" size={24} color={colors.muted} />
          </Pressable>
        ))}

        {/* FAQs */}
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        {faqs.map((faq, index) => (
          <View key={index} style={styles.faqCard}>
            <Text style={styles.faqQuestion}>{faq.q}</Text>
            <Text style={styles.faqAnswer}>{faq.a}</Text>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginTop: 8,
    marginBottom: 12,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 10,
    ...shadow,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  contactDesc: {
    fontSize: 12,
    color: colors.muted,
  },
  faqCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  faqAnswer: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
});

export default SupportPage;
