import React, {useState} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const colors = {
  red: '#C62828',
  text: '#212121',
  muted: '#757575',
  green: '#1D9E75',
};

const shadow = {
  shadowColor: '#000',
  shadowOpacity: 0.1,
  shadowRadius: 8,
  shadowOffset: {width: 0, height: 2},
  elevation: 3,
};

function ReportsDashboardSection({onBack}) {
  const [selectedPeriod, setSelectedPeriod] = useState('This Month');

  const periods = ['Today', 'This Week', 'This Month', 'This Year'];

  const reports = [
    {
      id: 1,
      title: 'Sales Report',
      desc: 'Monthly sales summary & analysis',
      icon: 'chart-line',
      color: '#4CAF50',
      value: '₹3,45,000',
      change: '+12%',
    },
    {
      id: 2,
      title: 'Purchase Report',
      desc: 'Purchase history & analysis',
      icon: 'cart',
      color: '#2196F3',
      value: '₹2,85,000',
      change: '+8%',
    },
    {
      id: 3,
      title: 'Stock Report',
      desc: 'Inventory levels & movement',
      icon: 'package-variant',
      color: '#FF9800',
      value: '245 items',
      change: '-5%',
    },
    {
      id: 4,
      title: 'Payment Report',
      desc: 'Payment history & outstanding',
      icon: 'cash',
      color: '#9C27B0',
      value: '₹2,45,000',
      change: 'Due',
    },
    {
      id: 5,
      title: 'GST Report',
      desc: 'GST summary & returns',
      icon: 'file-document',
      color: colors.red,
      value: '₹45,600',
      change: 'Tax',
    },
    {
      id: 6,
      title: 'Ledger Report',
      desc: 'Account statement',
      icon: 'book-open',
      color: '#00BCD4',
      value: '₹5,00,000',
      change: 'Credit',
    },
  ];

  const handleViewReport = (report) => {
    Alert.alert(
      report.title,
      `View detailed ${report.title.toLowerCase()} for ${selectedPeriod}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'View',
          onPress: () => {
            Alert.alert('Opening Report', `Loading ${report.title}...`);
          },
        },
      ]
    );
  };

  const handleDownloadReport = (report) => {
    Alert.alert(
      'Download Report',
      `Download ${report.title} as PDF?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Download',
          onPress: () => {
            Alert.alert('Success', `${report.title} downloaded successfully`);
          },
        },
      ]
    );
  };

  const handleShareReport = () => {
    Alert.alert(
      'Share Reports',
      'Share reports via email or WhatsApp?',
      [
        {text: 'Email', onPress: () => Alert.alert('Email', 'Opening email...')},
        {text: 'WhatsApp', onPress: () => Alert.alert('WhatsApp', 'Opening WhatsApp...')},
        {text: 'Cancel', style: 'cancel'},
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Navigation Bar */}
      <View style={styles.topNav}>
        <View style={styles.topNavLeft}>
          <Pressable style={styles.backBtn} onPress={onBack}>
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </Pressable>
          <Icon name="chart-box" size={24} color="#FFFFFF" />
          <Text style={styles.topNavTitle}>Reports Dashboard</Text>
        </View>
        <Pressable style={styles.shareBtn} onPress={handleShareReport}>
          <Icon name="share-variant" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Period Filter */}
      <View style={styles.periodSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.periodRow}>
          {periods.map((period) => (
            <Pressable
              key={period}
              onPress={() => setSelectedPeriod(period)}
              style={[
                styles.periodChip,
                selectedPeriod === period && styles.periodChipActive,
              ]}>
              <Text
                style={[
                  styles.periodText,
                  selectedPeriod === period && styles.periodTextActive,
                ]}>
                {period}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {reports.map(report => (
          <Pressable
            key={report.id}
            style={styles.reportCard}
            onPress={() => handleViewReport(report)}>
            <View style={[styles.reportIcon, {backgroundColor: report.color + '20'}]}>
              <Icon name={report.icon} size={28} color={report.color} />
            </View>
            <View style={styles.reportInfo}>
              <Text style={styles.reportTitle}>{report.title}</Text>
              <Text style={styles.reportDesc}>{report.desc}</Text>
              <View style={styles.reportStats}>
                <Text style={styles.reportValue}>{report.value}</Text>
                <Text style={[styles.reportChange, {color: report.change.includes('+') ? colors.green : colors.muted}]}>
                  {report.change}
                </Text>
              </View>
            </View>
            <Pressable
              style={styles.downloadBtn}
              onPress={(e) => {
                e.stopPropagation();
                handleDownloadReport(report);
              }}>
              <Icon name="download" size={20} color={colors.red} />
            </Pressable>
          </Pressable>
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
  topNav: {
    backgroundColor: colors.red,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadow,
  },
  topNavLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topNavTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  periodSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  periodRow: {
    paddingHorizontal: 20,
    gap: 8,
  },
  periodChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
  },
  periodChipActive: {
    backgroundColor: colors.red,
  },
  periodText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
  },
  periodTextActive: {
    color: '#FFFFFF',
  },
  content: {
    padding: 20,
  },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...shadow,
  },
  reportIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  reportDesc: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 8,
  },
  reportStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reportValue: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.text,
  },
  reportChange: {
    fontSize: 12,
    fontWeight: '700',
  },
  downloadBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(198, 40, 40, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ReportsDashboardSection;
