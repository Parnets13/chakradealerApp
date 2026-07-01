import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

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

function RequirementCard({module}) {
  const [isOpen, setIsOpen] = useState(true);
  const requiredCount = module.features.filter(
    feature => feature.priority === 'required',
  ).length;
  const importantCount = module.features.filter(
    feature => feature.priority === 'important',
  ).length;

  return (
    <View style={styles.card}>
      <Pressable style={styles.header} onPress={() => setIsOpen(value => !value)}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconBox, {backgroundColor: module.softColor}]}>
            <Icon name={module.icon} size={22} color={module.color} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{module.title}</Text>
            <Text style={styles.subtitle}>{module.features.length} features</Text>
          </View>
        </View>
        <View style={styles.featurePill}>
          <Text style={styles.featurePillText}>{module.features.length}</Text>
        </View>
        <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color="#475569" />
      </Pressable>

      <View style={styles.metrics}>
        <Metric label="Required" value={requiredCount} color="#B74722" />
        <Metric label="Important" value={importantCount} color="#9B620D" />
        <Metric
          label="Total"
          value={module.features.length}
          color={module.color}
        />
      </View>

      {isOpen ? (
        <View style={styles.list}>
          {module.features.map((feature, index) => (
            <FeatureItem
              key={`${module.id}-${feature.title}`}
              feature={feature}
              index={index + 1}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Metric({label, value, color}) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, {color}]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

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
        {feature.note ? <Text style={styles.featureNote}>{feature.note}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  header: {
    minHeight: 78,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 14,
    fontWeight: '900',
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 22,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 3,
  },
  featurePill: {
    minWidth: 34,
    height: 30,
    borderRadius: 15,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginLeft: 8,
  },
  featurePillText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '900',
  },
  toggleText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '900',
    marginLeft: 8,
  },
  metrics: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  metric: {
    flex: 1,
    minHeight: 66,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    padding: 12,
    marginHorizontal: 4,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 3,
  },
  list: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
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

export default RequirementCard;
