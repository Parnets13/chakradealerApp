import React, {useState} from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {dealerModules} from './dealerModules';

const module = dealerModules[2]; // Inventory & Stock Visibility

const priorityStyles = {
  required: {
    label: 'Required',
    backgroundColor: '#FFF0EA',
    borderColor: '#FFD6C7',
    color: '#B74722',
  },
  important: {
    label: 'Important',
    backgroundColor: '#FFF5DE',
    borderColor: '#FFE3A5',
    color: '#9B620D',
  },
  good: {
    label: 'Good to Have',
    backgroundColor: '#EEF9E5',
    borderColor: '#D7EDC1',
    color: '#4D7F1F',
  },
};

function FeatureItem({feature, index}) {
  const priority = priorityStyles[feature.priority];
  return (
    <View style={styles.featureRow}>
      <View style={styles.numberBadge}>
        <Text style={styles.numberText}>{index}</Text>
      </View>
      <View style={styles.featureBody}>
        <View
          style={[
            styles.priorityBadge,
            {
              backgroundColor: priority.backgroundColor,
              borderColor: priority.borderColor,
            },
          ]}>
          <Text style={[styles.priorityText, {color: priority.color}]}>
            {priority.label}
          </Text>
        </View>
        <Text style={styles.featureTitle}>{feature.title}</Text>
        {feature.note ? (
          <Text style={styles.featureNote}>{feature.note}</Text>
        ) : null}
      </View>
    </View>
  );
}

function InventoryStockSection() {
  const [modalVisible, setModalVisible] = useState(false);

  const requiredCount = module.features.filter(f => f.priority === 'required').length;
  const importantCount = module.features.filter(f => f.priority === 'important').length;
  const goodCount = module.features.filter(f => f.priority === 'good').length;

  return (
    <>
      {/* ── Compact Card ── */}
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => setModalVisible(true)}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, {backgroundColor: module.softColor}]}>
            <Icon name={module.icon} size={22} color={module.color} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.cardTitle}>{module.title}</Text>
            <Text style={styles.cardSubtitle}>{module.summary}</Text>
          </View>
          <View style={[styles.countPill, {borderColor: module.color + '40', backgroundColor: module.softColor}]}>
            <Text style={[styles.countPillText, {color: module.color}]}>
              {module.features.length}
            </Text>
          </View>
        </View>

        {/* Mini metrics row */}
        <View style={styles.metricsRow}>
          <View style={[styles.miniMetric, {backgroundColor: '#FFF0EA'}]}>
            <Text style={[styles.miniMetricValue, {color: '#B74722'}]}>{requiredCount}</Text>
            <Text style={styles.miniMetricLabel}>Required</Text>
          </View>
          <View style={[styles.miniMetric, {backgroundColor: '#FFF5DE'}]}>
            <Text style={[styles.miniMetricValue, {color: '#9B620D'}]}>{importantCount}</Text>
            <Text style={styles.miniMetricLabel}>Important</Text>
          </View>
          <View style={[styles.miniMetric, {backgroundColor: '#EEF9E5'}]}>
            <Text style={[styles.miniMetricValue, {color: '#4D7F1F'}]}>{goodCount}</Text>
            <Text style={styles.miniMetricLabel}>Good to Have</Text>
          </View>
        </View>

        {/* Tap hint */}
        <View style={styles.tapHint}>
          <Icon name="gesture-tap" size={14} color={module.color} />
          <Text style={[styles.tapHintText, {color: module.color}]}>
            Tap to view all features
          </Text>
        </View>
      </TouchableOpacity>

      {/* ── Modal ── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalSheet}>
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.iconBox, {backgroundColor: module.softColor}]}>
                  <Icon name={module.icon} size={22} color={module.color} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>{module.title}</Text>
                  <Text style={styles.modalSubtitle}>
                    {module.features.length} features listed
                  </Text>
                </View>
              </View>
              <Pressable
                style={styles.closeBtn}
                onPress={() => setModalVisible(false)}
                hitSlop={10}>
                <Icon name="close" size={20} color="#475569" />
              </Pressable>
            </View>

            {/* Metrics strip */}
            <View style={styles.metricsStrip}>
              <View style={styles.stripMetric}>
                <Text style={[styles.stripValue, {color: '#B74722'}]}>{requiredCount}</Text>
                <Text style={styles.stripLabel}>Required</Text>
              </View>
              <View style={styles.stripDivider} />
              <View style={styles.stripMetric}>
                <Text style={[styles.stripValue, {color: '#9B620D'}]}>{importantCount}</Text>
                <Text style={styles.stripLabel}>Important</Text>
              </View>
              <View style={styles.stripDivider} />
              <View style={styles.stripMetric}>
                <Text style={[styles.stripValue, {color: '#4D7F1F'}]}>{goodCount}</Text>
                <Text style={styles.stripLabel}>Good to Have</Text>
              </View>
              <View style={styles.stripDivider} />
              <View style={styles.stripMetric}>
                <Text style={[styles.stripValue, {color: module.color}]}>
                  {module.features.length}
                </Text>
                <Text style={styles.stripLabel}>Total</Text>
              </View>
            </View>

            {/* Feature list */}
            <ScrollView
              style={styles.featureScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{paddingBottom: 24}}>
              {module.features.map((feature, index) => (
                <FeatureItem
                  key={`${module.id}-${feature.title}`}
                  feature={feature}
                  index={index + 1}
                />
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  /* ─── Card ─── */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginVertical: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerCopy: {
    flex: 1,
  },
  cardTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 22,
  },
  cardSubtitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },
  countPill: {
    minWidth: 34,
    height: 30,
    borderRadius: 15,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginLeft: 8,
  },
  countPillText: {
    fontSize: 13,
    fontWeight: '900',
  },
  metricsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  miniMetric: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  miniMetricValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  miniMetricLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 6,
  },
  tapHintText: {
    fontSize: 12,
    fontWeight: '800',
  },

  /* ─── Modal ─── */
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    paddingTop: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '900',
  },
  modalSubtitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  metricsStrip: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 14,
  },
  stripMetric: {
    flex: 1,
    alignItems: 'center',
  },
  stripValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  stripLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
  stripDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  featureScroll: {
    paddingTop: 4,
  },

  /* ─── Feature rows (shared by modal) ─── */
  featureRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  numberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  numberText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '900',
  },
  featureBody: {
    flex: 1,
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '900',
  },
  featureTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 21,
  },
  featureNote: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
});

export default InventoryStockSection;
