import React, {useState} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const colors = {
  red: '#C62828',
  text: '#212121',
  muted: '#757575',
  green: '#1D9E75',
  orange: '#FF6F00',
};

const shadow = {
  shadowColor: '#000',
  shadowOpacity: 0.1,
  shadowRadius: 8,
  shadowOffset: {width: 0, height: 2},
  elevation: 3,
};

function ReturnsComplaintsSection({onBack}) {
  const [activeTab, setActiveTab] = useState('returns');
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showComplaintModal, setShowComplaintModal] = useState(false);

  const returns = [
    {
      id: 1,
      code: 'RET-2026-101',
      product: 'Coconut Oil 1L',
      qty: 12,
      reason: 'Damaged packaging',
      date: '28 May 2026',
      status: 'Approved',
      statusColor: colors.green,
      creditNote: 'CN-2026-220',
      creditAmount: '₹14,820',
    },
    {
      id: 2,
      code: 'RET-2026-098',
      product: 'Sesame Oil 500ml',
      qty: 24,
      reason: 'Wrong product',
      date: '25 May 2026',
      status: 'Pending',
      statusColor: '#FFA726',
    },
    {
      id: 3,
      code: 'RET-2026-095',
      product: 'Groundnut Oil 5L',
      qty: 8,
      reason: 'Quality issue',
      date: '22 May 2026',
      status: 'Rejected',
      statusColor: colors.red,
      rejectionReason: 'Product seal intact, no quality issue found',
    },
  ];

  const complaints = [
    {
      id: 1,
      code: 'CMP-2026-045',
      subject: 'Late delivery',
      desc: 'Order ORD-2026-4821 delayed by 3 days',
      date: '27 May 2026',
      status: 'Resolved',
      statusColor: colors.green,
      resolution: 'Delivery completed with compensation',
    },
    {
      id: 2,
      code: 'CMP-2026-042',
      subject: 'Quality issue',
      desc: 'Product quality not as expected in ORD-2026-4803',
      date: '24 May 2026',
      status: 'In Progress',
      statusColor: '#FFA726',
    },
    {
      id: 3,
      code: 'CMP-2026-039',
      subject: 'Missing items',
      desc: '5 units missing from order ORD-2026-4790',
      date: '20 May 2026',
      status: 'Resolved',
      statusColor: colors.green,
      resolution: 'Missing items delivered separately',
    },
  ];

  const handleRequestReturn = () => {
    setShowReturnModal(true);
  };

  const handleRaiseComplaint = () => {
    setShowComplaintModal(true);
  };

  const handleSubmitReturn = () => {
    setShowReturnModal(false);
    Alert.alert('Success', 'Return request submitted successfully');
  };

  const handleSubmitComplaint = () => {
    setShowComplaintModal(false);
    Alert.alert('Success', 'Complaint raised successfully');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={onBack}>
          <Icon name="arrow-left" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.title}>Returns & Complaints</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {['returns', 'complaints'].map(tab => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.tabActive]}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'returns' ? 'Returns' : 'Complaints'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {activeTab === 'returns' ? (
          <>
            <Pressable style={styles.addButton} onPress={handleRequestReturn}>
              <Icon name="plus-circle" size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Request Return</Text>
            </Pressable>

            {returns.map(item => (
              <ReturnCard key={item.id} item={item} />
            ))}
          </>
        ) : (
          <>
            <Pressable style={styles.addButton} onPress={handleRaiseComplaint}>
              <Icon name="plus-circle" size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Raise Complaint</Text>
            </Pressable>

            {complaints.map(item => (
              <ComplaintCard key={item.id} item={item} />
            ))}
          </>
        )}
      </ScrollView>

      {/* Return Modal */}
      <Modal
        visible={showReturnModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReturnModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request Return</Text>
            <TextInput
              style={styles.input}
              placeholder="Order ID"
              placeholderTextColor={colors.muted}
            />
            <TextInput
              style={styles.input}
              placeholder="Product Name"
              placeholderTextColor={colors.muted}
            />
            <TextInput
              style={styles.input}
              placeholder="Quantity"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Reason for return"
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setShowReturnModal(false)}>
                <Text style={styles.modalBtnTextCancel}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnSubmit]}
                onPress={handleSubmitReturn}>
                <Text style={styles.modalBtnTextSubmit}>Submit</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Complaint Modal */}
      <Modal
        visible={showComplaintModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowComplaintModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Raise Complaint</Text>
            <TextInput
              style={styles.input}
              placeholder="Subject"
              placeholderTextColor={colors.muted}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description"
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={6}
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setShowComplaintModal(false)}>
                <Text style={styles.modalBtnTextCancel}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnSubmit]}
                onPress={handleSubmitComplaint}>
                <Text style={styles.modalBtnTextSubmit}>Submit</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}


function ReturnCard({item}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardCode}>{item.code}</Text>
        <View style={[styles.statusBadge, {backgroundColor: item.statusColor + '20'}]}>
          <Text style={[styles.statusText, {color: item.statusColor}]}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.cardProduct}>{item.product}</Text>
      <Text style={styles.cardMeta}>Quantity: {item.qty} units · {item.date}</Text>
      <Text style={styles.cardReason}>Reason: {item.reason}</Text>

      {item.creditNote && (
        <View style={styles.creditNoteBox}>
          <Icon name="check-circle" size={16} color={colors.green} />
          <Text style={styles.creditNoteText}>
            Credit Note: {item.creditNote} · {item.creditAmount}
          </Text>
        </View>
      )}

      {item.rejectionReason && (
        <View style={styles.rejectionBox}>
          <Icon name="alert-circle" size={16} color={colors.red} />
          <Text style={styles.rejectionText}>{item.rejectionReason}</Text>
        </View>
      )}

      <Pressable style={styles.expandBtn} onPress={() => setExpanded(!expanded)}>
        <Text style={styles.expandBtnText}>
          {expanded ? 'Show Less' : 'View Details'}
        </Text>
        <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.red} />
      </Pressable>
    </View>
  );
}

function ComplaintCard({item}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardCode}>{item.code}</Text>
        <View style={[styles.statusBadge, {backgroundColor: item.statusColor + '20'}]}>
          <Text style={[styles.statusText, {color: item.statusColor}]}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.cardProduct}>{item.subject}</Text>
      <Text style={styles.cardDesc}>{item.desc}</Text>
      <Text style={styles.cardDate}>{item.date}</Text>

      {item.resolution && expanded && (
        <View style={styles.resolutionBox}>
          <Icon name="check-circle" size={16} color={colors.green} />
          <Text style={styles.resolutionText}>{item.resolution}</Text>
        </View>
      )}

      <Pressable style={styles.expandBtn} onPress={() => setExpanded(!expanded)}>
        <Text style={styles.expandBtnText}>
          {expanded ? 'Show Less' : 'View Details'}
        </Text>
        <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.red} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: colors.red,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadow,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  placeholder: {
    width: 40,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.red,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  content: {
    padding: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.red,
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
    ...shadow,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...shadow,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardCode: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cardProduct: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 2,
  },
  cardReason: {
    fontSize: 12,
    color: colors.muted,
  },
  cardDesc: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
  },
  creditNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5F0',
    padding: 10,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
  },
  creditNoteText: {
    fontSize: 12,
    color: colors.green,
    fontWeight: '700',
    flex: 1,
  },
  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 10,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
  },
  rejectionText: {
    fontSize: 12,
    color: colors.red,
    fontWeight: '600',
    flex: 1,
  },
  resolutionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5F0',
    padding: 10,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
  },
  resolutionText: {
    fontSize: 12,
    color: colors.green,
    fontWeight: '600',
    flex: 1,
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 8,
  },
  expandBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.red,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.text,
    marginBottom: 12,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: '#F5F5F5',
  },
  modalBtnSubmit: {
    backgroundColor: colors.red,
  },
  modalBtnTextCancel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  modalBtnTextSubmit: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default ReturnsComplaintsSection;
