import React, {useState} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, shadow} from './theme';

const TABS = ['Profile Info', 'Bank Details', 'Documents'];

const LANGUAGES = [
  'Hindi', 'English', 'Urdu', 'Tamil', 'Telugu', 'Kannada',
  'Malayalam', 'Bengali', 'Marathi', 'Gujarati', 'Punjabi'
];

function ProfilePage({onLogout}) {
  const [activeTab, setActiveTab] = useState('Profile Info');
  const [editing, setEditing] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('Hindi');
  
  const [profile, setProfile] = useState({
    name: 'Rajan Mehta',
    email: 'rajan.mehta@gmail.com',
    phone: '+91 98765 43210',
    dob: '14 August 1985',
    gender: 'Male',
    address: '42, MG Road, Indiranagar, Bengaluru, Karnataka — 560038',
  });

  const [notifications, setNotifications] = useState({
    transactionSMS: true,
    transactionEmail: false,
    transactionPush: true,
    securitySMS: true,
    securityEmail: true,
    securityPush: true,
    offersSMS: false,
    offersEmail: true,
    offersPush: false,
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Icon name="account" size={40} color="#FFFFFF" />
            </View>
            <Pressable style={styles.cameraBtn}>
              <Icon name="camera" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile.name}</Text>
            <Text style={styles.profileMeta}>SCI-DLR-2041</Text>
          
          </View>
        </View>

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}>
          {TABS.map(tab => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tab, activeTab === tab && styles.tabActive]}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}>
        {activeTab === 'Profile Info' && (
          <ProfileInfoTab
            profile={profile}
            setProfile={setProfile}
            editing={editing}
            setEditing={setEditing}
            notifications={notifications}
            setNotifications={setNotifications}
            selectedLanguage={selectedLanguage}
            setSelectedLanguage={setSelectedLanguage}
          />
        )}
        {activeTab === 'Bank Details' && <BankDetailsTab />}
        {activeTab === 'Documents' && <DocumentsTab />}

        {/* Logout Button */}
        <Pressable onPress={onLogout} style={styles.logoutBtn}>
          <Icon name="logout" size={20} color="#F44336" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>

        <Text style={styles.versionText}>Version 1.0.0</Text>
      </ScrollView>
    </View>
  );
}

// Profile Info Tab
function ProfileInfoTab({profile, setProfile, editing, setEditing, notifications, setNotifications, selectedLanguage, setSelectedLanguage}) {
  return (
    <>
      {/* Personal Details */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Icon name="account-circle" size={20} color={colors.orange} />
            <Text style={styles.sectionTitle}>Personal Details</Text>
          </View>
          <Pressable onPress={() => setEditing(!editing)} style={styles.editBtn}>
            <Icon name={editing ? 'check' : 'pencil'} size={16} color={colors.red} />
            <Text style={styles.editBtnText}>{editing ? 'Save' : 'Edit'}</Text>
          </Pressable>
        </View>

        <View style={styles.fieldGrid}>
          <Field label="FULL NAME" value={profile.name} editing={editing} 
            onChange={(val) => setProfile({...profile, name: val})} />
          <Field label="MOBILE NUMBER" value={profile.phone} />
          <Field label="EMAIL ADDRESS" value={profile.email} editing={editing}
            onChange={(val) => setProfile({...profile, email: val})} />
          <Field label="DATE OF BIRTH" value={profile.dob} editing={editing}
            onChange={(val) => setProfile({...profile, dob: val})} />
          <Field label="GENDER" value={profile.gender} editing={editing}
            onChange={(val) => setProfile({...profile, gender: val})} />
          <Field label="OCCUPATION" value="Dealer" />
        </View>

        <Field label="RESIDENTIAL ADDRESS" value={profile.address} editing={editing} fullWidth
          onChange={(val) => setProfile({...profile, address: val})} />
      </View>

      {/* Notification Preferences */}
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Icon name="bell" size={20} color={colors.red} />
          <Text style={styles.sectionTitle}>Notification Preferences</Text>
        </View>

        <NotificationGroup
          title="TRANSACTIONS"
          items={[
            {key: 'transactionSMS', label: 'SMS alerts', desc: 'Instant SMS on every transaction'},
            {key: 'transactionEmail', label: 'Email alerts', desc: 'Transaction summary via email'},
            {key: 'transactionPush', label: 'Push notifications', desc: 'In-app transaction alerts'},
          ]}
          notifications={notifications}
          setNotifications={setNotifications}
        />

        <NotificationGroup
          title="SECURITY"
          items={[
            {key: 'securitySMS', label: 'SMS alerts', desc: 'Login & security updates via SMS'},
            {key: 'securityEmail', label: 'Email alerts', desc: 'Security notifications via email'},
            {key: 'securityPush', label: 'Push notifications', desc: 'In-app security alerts'},
          ]}
          notifications={notifications}
          setNotifications={setNotifications}
        />

        <NotificationGroup
          title="OFFERS"
          items={[
            {key: 'offersSMS', label: 'SMS alerts', desc: 'Promotional offers via SMS'},
            {key: 'offersEmail', label: 'Email alerts', desc: 'Deals and offers via email'},
            {key: 'offersPush', label: 'Push notifications', desc: 'In-app promotional alerts'},
          ]}
          notifications={notifications}
          setNotifications={setNotifications}
        />
      </View>

      {/* Language Selector */}
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Icon name="translate" size={20} color={colors.red} />
          <Text style={styles.sectionTitle}>Language</Text>
        </View>
        <View style={styles.languageGrid}>
          {LANGUAGES.map(lang => (
            <Pressable
              key={lang}
              onPress={() => setSelectedLanguage(lang)}
              style={[
                styles.languageChip,
                selectedLanguage === lang && styles.languageChipActive,
              ]}>
              <Text style={[
                styles.languageText,
                selectedLanguage === lang && styles.languageTextActive,
              ]}>
                {lang}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </>
  );
}

// Bank Details Tab
function BankDetailsTab() {
  const [banks, setBanks] = useState([
    {id: 1, name: 'State Bank of India', branch: 'MG Road, Bengaluru', accountName: 'Rajan Enterprises', accountNo: 'XXXXXXXX4521', ifsc: 'SBIN0001234', isPrimary: true},
    {id: 2, name: 'HDFC Bank', branch: 'Indiranagar, Bengaluru', accountName: 'Rajan Enterprises', accountNo: 'XXXXXXXX7890', ifsc: 'HDFC0001234', isPrimary: false},
  ]);

  return (
    <>
      <View style={styles.securityBanner}>
        <Icon name="shield-check" size={24} color="#4CAF50" />
        <Text style={styles.securityText}>
          All bank details are encrypted with AES 256-bit encryption
        </Text>
      </View>

      {banks.map(bank => (
        <View key={bank.id} style={styles.bankCard}>
          <View style={styles.bankHeader}>
            <View style={styles.bankIcon}>
              <Icon name="bank" size={24} color={colors.orange} />
            </View>
            <View style={styles.bankInfo}>
              <Text style={styles.bankName}>{bank.name}</Text>
              <Text style={styles.bankBranch}>{bank.branch}</Text>
            </View>
            {bank.isPrimary && (
              <View style={styles.primaryBadge}>
                <Text style={styles.primaryText}>Primary</Text>
              </View>
            )}
          </View>

          <View style={styles.bankDetails}>
            <BankField label="Account Name" value={bank.accountName} />
            <BankField label="Account No." value={bank.accountNo} />
            <BankField label="IFSC Code" value={bank.ifsc} />
          </View>

          <View style={styles.bankActions}>
            {!bank.isPrimary && (
              <Pressable style={styles.bankActionBtn}>
                <Icon name="star" size={16} color={colors.red} />
                <Text style={styles.bankActionText}>Set Primary</Text>
              </Pressable>
            )}
            <Pressable style={styles.bankActionBtn}>
              <Icon name="delete" size={16} color="#F44336" />
              <Text style={[styles.bankActionText, {color: '#F44336'}]}>Remove</Text>
            </Pressable>
          </View>
        </View>
      ))}

      <Pressable style={styles.addBankBtn}>
        <Icon name="plus-circle" size={20} color={colors.red} />
        <Text style={styles.addBankText}>Add New Bank Account</Text>
      </Pressable>
    </>
  );
}

// Documents Tab
function DocumentsTab() {
  const [docs, setDocs] = useState([
    {id: 1, name: 'Aadhaar Card', status: 'Verified', icon: 'check-circle', color: '#4CAF50'},
    {id: 2, name: 'PAN Card', status: 'Verified', icon: 'check-circle', color: '#4CAF50'},
    {id: 3, name: 'Passport', status: 'Pending', icon: 'clock', color: '#FFA726'},
    {id: 4, name: 'Driving Licence', status: 'Upload', icon: 'upload', color: '#6B7C8A'},
  ]);

  const verified = docs.filter(d => d.status === 'Verified').length;
  const progress = (verified / docs.length) * 100;

  return (
    <>
      <View style={styles.progressCard}>
        <Text style={styles.progressTitle}>Document Verification Progress</Text>
        <Text style={styles.progressValue}>{verified}/{docs.length} Verified</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, {width: `${progress}%`}]} />
        </View>
        <Text style={styles.progressPercent}>{Math.round(progress)}% Complete</Text>
      </View>

      {docs.map(doc => (
        <View key={doc.id} style={styles.docCard}>
          <View style={styles.docIcon}>
            <Icon name={doc.icon} size={24} color={doc.color} />
          </View>
          <View style={styles.docInfo}>
            <Text style={styles.docName}>{doc.name}</Text>
            <Text style={[styles.docStatus, {color: doc.color}]}>{doc.status}</Text>
          </View>
          {doc.status === 'Upload' && (
            <Pressable style={styles.uploadBtn}>
              <Icon name="upload" size={18} color="#FFFFFF" />
            </Pressable>
          )}
        </View>
      ))}

      <View style={styles.tipsCard}>
        <Icon name="information" size={20} color="#4A90E2" />
        <View style={styles.tipsContent}>
          <Text style={styles.tipsTitle}>Upload Tips</Text>
          <Text style={styles.tipsText}>• Clear, readable images</Text>
          <Text style={styles.tipsText}>• File size under 5MB</Text>
          <Text style={styles.tipsText}>• Formats: JPG, PNG, PDF</Text>
        </View>
      </View>
    </>
  );
}

// Helper Components
function Field({label, value, editing, onChange, fullWidth}) {
  return (
    <View style={[styles.field, fullWidth && styles.fieldFull]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {editing && onChange ? (
        <TextInput
          value={value}
          onChangeText={onChange}
          style={styles.fieldInput}
          multiline={fullWidth}
        />
      ) : (
        <Text style={styles.fieldValue}>{value}</Text>
      )}
    </View>
  );
}

function NotificationGroup({title, items, notifications, setNotifications}) {
  return (
    <View style={styles.notifGroup}>
      <Text style={styles.notifGroupTitle}>{title}</Text>
      {items.map(item => (
        <View key={item.key} style={styles.notifItem}>
          <View style={styles.notifInfo}>
            <Text style={styles.notifLabel}>{item.label}</Text>
            <Text style={styles.notifDesc}>{item.desc}</Text>
          </View>
          <Switch
            value={notifications[item.key]}
            onValueChange={(val) => setNotifications({...notifications, [item.key]: val})}
            thumbColor="#FFFFFF"
            trackColor={{false: '#CCCCCC', true: colors.red}}
          />
        </View>
      ))}
    </View>
  );
}

function BankField({label, value}) {
  return (
    <View style={styles.bankField}>
      <Text style={styles.bankFieldLabel}>{label}</Text>
      <Text style={styles.bankFieldValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: colors.red,
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  profileCard: {
    alignItems: 'center',
    width: '100%',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
    alignSelf: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#433a3aff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.red,
  },
  profileInfo: {
    alignItems: 'center',
    width: '100%',
  },
  profileName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 4,
    textAlign: 'center',
  },
  profileMeta: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
    textAlign: 'center',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'center',
  },
  verifiedText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
    backgroundColor: colors.red,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingBottom: 10,
    backgroundColor: 'transparent',
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#8B0000',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  content: {
    padding: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    ...shadow,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 8,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(198, 40, 40, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  editBtnText: {
    color: colors.red,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  fieldGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  field: {
    width: '47%',
    marginBottom: 12,
  },
  fieldFull: {
    width: '100%',
  },
  fieldLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  fieldValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  fieldInput: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: colors.red,
    borderRadius: 10,
    padding: 10,
    color: colors.text,
    fontSize: 14,
  },
  notifGroup: {
    marginBottom: 16,
  },
  notifGroupTitle: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  notifItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  notifInfo: {
    flex: 1,
  },
  notifLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  notifDesc: {
    color: colors.muted,
    fontSize: 12,
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  languageChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: colors.line,
  },
  languageChipActive: {
    backgroundColor: colors.red,
    borderColor: colors.red,
  },
  languageText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  languageTextActive: {
    color: '#FFFFFF',
  },
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  securityText: {
    flex: 1,
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 10,
  },
  bankCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow,
  },
  bankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bankIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(198, 40, 40, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bankInfo: {
    flex: 1,
  },
  bankName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  bankBranch: {
    color: colors.muted,
    fontSize: 11,
  },
  primaryBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  primaryText: {
    color: '#4CAF50',
    fontSize: 11,
    fontWeight: '800',
  },
  bankDetails: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  bankField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  bankFieldLabel: {
    color: colors.muted,
    fontSize: 12,
  },
  bankFieldValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  bankActions: {
    flexDirection: 'row',
    gap: 10,
  },
  bankActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  bankActionText: {
    color: colors.red,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  addBankBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(198, 40, 40, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(198, 40, 40, 0.3)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  addBankText: {
    color: colors.red,
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 8,
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow,
  },
  progressTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  progressValue: {
    color: colors.red,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressPercent: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow,
  },
  docIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  docStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  uploadBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipsCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
  },
  tipsContent: {
    flex: 1,
    marginLeft: 10,
  },
  tipsTitle: {
    color: '#4A90E2',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },
  tipsText: {
    color: colors.muted,
    fontSize: 11,
    marginBottom: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.3)',
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
    marginBottom: 16,
  },
  logoutText: {
    color: '#F44336',
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 8,
  },
  versionText: {
    color: colors.muted,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
  },
});

export default ProfilePage;
