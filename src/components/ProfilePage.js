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

function ProfilePage({onLogout, onNavigate}) {
  const [activeTab, setActiveTab] = useState('Profile Info');
  const [editing, setEditing] = useState(false);

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
              <Text style={styles.avatarInitials}>RM</Text>
            </View>
            <Pressable style={styles.cameraBtn}>
              <Icon name="camera" size={14} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Notification Button - Top Right */}
          {onNavigate && (
            <Pressable
              onPress={() => onNavigate('notifications')}
              style={styles.notificationBtn}>
              <Icon name="bell-ring-outline" size={22} color="#FFFFFF" />
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>3</Text>
              </View>
            </Pressable>
          )}

          <Text style={styles.profileName}>{profile.name}</Text>
          <View style={styles.idRow}>
            <Icon name="card-account-details" size={13} color="rgba(255,255,255,0.8)" />
            <Text style={styles.profileMeta}>  SCI-DLR-2041</Text>
          </View>
          <View style={styles.verifiedBadge}>
            <Icon name="shield-check" size={13} color="#4CAF50" />
            <Text style={styles.verifiedText}>  KYC Verified</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsRow}>
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
        </View>
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
          />
        )}
        {activeTab === 'Bank Details' && <BankDetailsTab />}
        {activeTab === 'Documents' && <DocumentsTab />}

        <Pressable onPress={onLogout} style={styles.logoutBtn}>
          <Icon name="logout-variant" size={20} color="#F44336" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────
// Profile Info Tab
// ─────────────────────────────────────────────
function ProfileInfoTab({profile, setProfile, editing, setEditing, notifications, setNotifications}) {
  return (
    <>
      {/* Personal Details */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionIconBox}>
              <Icon name="account-circle" size={18} color={colors.red} />
            </View>
            <Text style={styles.sectionTitle}>Personal Details</Text>
          </View>
          <Pressable onPress={() => setEditing(!editing)} style={[styles.editBtn, editing && styles.editBtnSave]}>
            <Icon name={editing ? 'check' : 'pencil-outline'} size={15} color={editing ? '#4CAF50' : colors.red} />
            <Text style={[styles.editBtnText, editing && {color: '#4CAF50'}]}>{editing ? 'Save' : 'Edit'}</Text>
          </Pressable>
        </View>

        <View style={styles.detailsGrid}>
          <DetailField icon="account-outline" label="Full Name" value={profile.name} editing={editing}
            onChange={val => setProfile({...profile, name: val})} />
          <DetailField icon="phone-outline" label="Mobile Number" value={profile.phone} />
          <DetailField icon="email-outline" label="Email Address" value={profile.email} editing={editing}
            onChange={val => setProfile({...profile, email: val})} />
          <DetailField icon="calendar-outline" label="Date of Birth" value={profile.dob} editing={editing}
            onChange={val => setProfile({...profile, dob: val})} />
          <DetailField icon="gender-male-female" label="Gender" value={profile.gender} editing={editing}
            onChange={val => setProfile({...profile, gender: val})} />
          <DetailField icon="briefcase-outline" label="Occupation" value="Dealer" />
        </View>

        <View style={styles.addressBox}>
          <View style={styles.addressLabelRow}>
            <Icon name="map-marker-outline" size={15} color={colors.red} />
            <Text style={styles.addressLabel}>  RESIDENTIAL ADDRESS</Text>
          </View>
          {editing ? (
            <TextInput
              value={profile.address}
              onChangeText={val => setProfile({...profile, address: val})}
              style={styles.addressInput}
              multiline
            />
          ) : (
            <Text style={styles.addressValue}>{profile.address}</Text>
          )}
        </View>
      </View>

      {/* Notification Preferences */}
      <NotificationsSection notifications={notifications} setNotifications={setNotifications} />
    </>
  );
}

// ─────────────────────────────────────────────
// Notifications Section
// ─────────────────────────────────────────────
const NOTIF_GROUPS = [
  {
    key: 'transactions',
    label: 'Transactions',
    icon: 'swap-horizontal',
    color: '#4A90E2',
    bg: 'rgba(74,144,226,0.1)',
    items: [
      {key: 'transactionSMS',   icon: 'message-text-outline',  label: 'SMS Alerts',        desc: 'Instant SMS on every transaction'},
      {key: 'transactionEmail', icon: 'email-outline',          label: 'Email Alerts',      desc: 'Transaction summary via email'},
      {key: 'transactionPush',  icon: 'bell-outline',           label: 'Push Notifications',desc: 'In-app transaction alerts'},
    ],
  },
  {
    key: 'security',
    label: 'Security',
    icon: 'shield-lock-outline',
    color: '#F26A21',
    bg: 'rgba(242,106,33,0.1)',
    items: [
      {key: 'securitySMS',   icon: 'message-text-outline', label: 'SMS Alerts',        desc: 'Login & security updates via SMS'},
      {key: 'securityEmail', icon: 'email-outline',         label: 'Email Alerts',      desc: 'Security notifications via email'},
      {key: 'securityPush',  icon: 'bell-outline',          label: 'Push Notifications',desc: 'In-app security alerts'},
    ],
  },
  {
    key: 'offers',
    label: 'Offers & Promotions',
    icon: 'tag-outline',
    color: '#9C27B0',
    bg: 'rgba(156,39,176,0.1)',
    items: [
      {key: 'offersSMS',   icon: 'message-text-outline', label: 'SMS Alerts',        desc: 'Promotional offers via SMS'},
      {key: 'offersEmail', icon: 'email-outline',         label: 'Email Alerts',      desc: 'Deals and offers via email'},
      {key: 'offersPush',  icon: 'bell-outline',          label: 'Push Notifications',desc: 'In-app promotional alerts'},
    ],
  },
];

function NotificationsSection({notifications, setNotifications}) {
  const [expanded, setExpanded] = useState({transactions: true, security: false, offers: false});

  const toggle = key => setExpanded(prev => ({...prev, [key]: !prev[key]}));

  return (
    <View style={styles.section}>
      <View style={styles.sectionTitleRow}>
        <View style={[styles.sectionIconBox, {backgroundColor: 'rgba(197,31,43,0.1)'}]}>
          <Icon name="bell-ring-outline" size={18} color={colors.red} />
        </View>
        <Text style={styles.sectionTitle}>Notification Preferences</Text>
      </View>

      {NOTIF_GROUPS.map(group => {
        const activeCount = group.items.filter(i => notifications[i.key]).length;
        return (
          <View key={group.key} style={styles.notifGroupCard}>
            <Pressable onPress={() => toggle(group.key)} style={styles.notifGroupHeader}>
              <View style={[styles.notifGroupIcon, {backgroundColor: group.bg}]}>
                <Icon name={group.icon} size={18} color={group.color} />
              </View>
              <View style={styles.notifGroupInfo}>
                <Text style={styles.notifGroupLabel}>{group.label}</Text>
                <Text style={styles.notifGroupSub}>{activeCount}/{group.items.length} enabled</Text>
              </View>
              <View style={styles.notifGroupRight}>
                <View style={[styles.notifCountBadge, {backgroundColor: group.bg}]}>
                  <Text style={[styles.notifCountText, {color: group.color}]}>{activeCount} on</Text>
                </View>
                <Icon name={expanded[group.key] ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} style={{marginLeft: 8}} />
              </View>
            </Pressable>

            {expanded[group.key] && (
              <View style={styles.notifItemsContainer}>
                {group.items.map((item, idx) => (
                  <View key={item.key} style={[styles.notifItem, idx === group.items.length - 1 && {borderBottomWidth: 0}]}>
                    <View style={styles.notifItemIcon}>
                      <Icon name={item.icon} size={16} color={group.color} />
                    </View>
                    <View style={styles.notifItemInfo}>
                      <Text style={styles.notifLabel}>{item.label}</Text>
                      <Text style={styles.notifDesc}>{item.desc}</Text>
                    </View>
                    <Switch
                      value={notifications[item.key]}
                      onValueChange={val => setNotifications({...notifications, [item.key]: val})}
                      thumbColor="#FFFFFF"
                      trackColor={{false: '#DEDEDE', true: group.color}}
                      style={{transform: [{scaleX: 0.85}, {scaleY: 0.85}]}}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────
// Bank Details Tab
// ─────────────────────────────────────────────
function BankDetailsTab() {
  const [banks, setBanks] = useState([
    {id: 1, name: 'State Bank of India', branch: 'MG Road, Bengaluru', accountName: 'Rajan Enterprises', accountNo: '•••• •••• 4521', ifsc: 'SBIN0001234', type: 'Savings', isPrimary: true},
    {id: 2, name: 'HDFC Bank', branch: 'Indiranagar, Bengaluru', accountName: 'Rajan Enterprises', accountNo: '•••• •••• 7890', ifsc: 'HDFC0001234', type: 'Current', isPrimary: false},
  ]);

  const setPrimary = id => setBanks(prev => prev.map(b => ({...b, isPrimary: b.id === id})));
  const removeBank = id => setBanks(prev => prev.filter(b => b.id !== id));

  return (
    <>
      {/* Security banner */}
      <View style={styles.encBanner}>
        <View style={styles.encIconBox}>
          <Icon name="shield-lock" size={22} color="#4CAF50" />
        </View>
        <View style={{flex: 1}}>
          <Text style={styles.encTitle}>Bank-Grade Security</Text>
          <Text style={styles.encDesc}>All details encrypted with AES-256 bit encryption</Text>
        </View>
        <Icon name="check-circle" size={18} color="#4CAF50" />
      </View>

      {banks.map(bank => (
        <View key={bank.id} style={[styles.bankCard, bank.isPrimary && styles.bankCardPrimary]}>
          {/* Bank Header */}
          <View style={styles.bankCardHeader}>
            <View style={styles.bankLogoBox}>
              <Icon name="bank" size={22} color={bank.isPrimary ? '#FFFFFF' : colors.orange} />
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.bankName}>{bank.name}</Text>
              <Text style={styles.bankBranch}>{bank.branch}</Text>
            </View>
            {bank.isPrimary && (
              <View style={styles.primaryBadge}>
                <Icon name="star" size={11} color="#4CAF50" />
                <Text style={styles.primaryText}> Primary</Text>
              </View>
            )}
          </View>

          {/* Account Info Grid */}
          <View style={styles.bankInfoGrid}>
            <View style={styles.bankInfoCell}>
              <Text style={styles.bankInfoLabel}>Account Name</Text>
              <Text style={styles.bankInfoValue}>{bank.accountName}</Text>
            </View>
            <View style={styles.bankInfoCell}>
              <Text style={styles.bankInfoLabel}>Account Type</Text>
              <Text style={styles.bankInfoValue}>{bank.type}</Text>
            </View>
            <View style={styles.bankInfoCell}>
              <Text style={styles.bankInfoLabel}>Account No.</Text>
              <Text style={[styles.bankInfoValue, styles.accountNoText]}>{bank.accountNo}</Text>
            </View>
            <View style={styles.bankInfoCell}>
              <Text style={styles.bankInfoLabel}>IFSC Code</Text>
              <Text style={styles.bankInfoValue}>{bank.ifsc}</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.bankActionsRow}>
            {!bank.isPrimary && (
              <Pressable onPress={() => setPrimary(bank.id)} style={styles.bankBtnOutline}>
                <Icon name="star-outline" size={15} color={colors.orange} />
                <Text style={[styles.bankBtnText, {color: colors.orange}]}>  Set Primary</Text>
              </Pressable>
            )}
            <Pressable style={styles.bankBtnEdit}>
              <Icon name="pencil-outline" size={15} color={colors.red} />
              <Text style={styles.bankBtnText}>  Edit</Text>
            </Pressable>
            {!bank.isPrimary && (
              <Pressable onPress={() => removeBank(bank.id)} style={styles.bankBtnDelete}>
                <Icon name="trash-can-outline" size={15} color="#F44336" />
                <Text style={[styles.bankBtnText, {color: '#F44336'}]}>  Remove</Text>
              </Pressable>
            )}
          </View>
        </View>
      ))}

      <Pressable style={styles.addBankBtn}>
        <View style={styles.addBankIconBox}>
          <Icon name="plus" size={20} color="#FFFFFF" />
        </View>
        <Text style={styles.addBankText}>Add New Bank Account</Text>
      </Pressable>
    </>
  );
}

// ─────────────────────────────────────────────
// Documents Tab
// ─────────────────────────────────────────────
const DOC_LIST = [
  {id: 1, name: 'Aadhaar Card', desc: 'Govt. issued ID proof', status: 'Verified',  icon: 'card-account-details',   color: '#4CAF50', bg: 'rgba(76,175,80,0.1)'},
  {id: 2, name: 'PAN Card',     desc: 'Income tax identifier', status: 'Verified',  icon: 'credit-card-outline',      color: '#4CAF50', bg: 'rgba(76,175,80,0.1)'},
  {id: 3, name: 'Passport',     desc: 'International travel doc', status: 'Pending', icon: 'passport',                color: '#FFA726', bg: 'rgba(255,167,38,0.1)'},
  {id: 4, name: 'Driving Licence', desc: 'Valid driving license', status: 'Upload', icon: 'card-text-outline',        color: '#9E9E9E', bg: 'rgba(158,158,158,0.1)'},
  {id: 5, name: 'GST Certificate', desc: 'Business registration', status: 'Upload', icon: 'file-certificate-outline', color: '#9E9E9E', bg: 'rgba(158,158,158,0.1)'},
];

function DocumentsTab() {
  const [docs] = useState(DOC_LIST);

  const verified  = docs.filter(d => d.status === 'Verified').length;
  const pending   = docs.filter(d => d.status === 'Pending').length;
  const upload    = docs.filter(d => d.status === 'Upload').length;
  const progress  = (verified / docs.length) * 100;

  return (
    <>
      {/* Progress Card */}
      <View style={styles.progressCard}>
        <View style={styles.progressTopRow}>
          <View>
            <Text style={styles.progressLabel}>Verification Progress</Text>
            <Text style={styles.progressFraction}>{verified}/{docs.length} Documents</Text>
          </View>
          <View style={styles.progressCircle}>
            <Text style={styles.progressPct}>{Math.round(progress)}%</Text>
          </View>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, {width: `${progress}%`}]} />
        </View>
        <View style={styles.progressStats}>
          <ProgressStat label="Verified" count={verified}  color="#4CAF50" />
          <ProgressStat label="Pending"  count={pending}   color="#FFA726" />
          <ProgressStat label="Upload"   count={upload}    color="#9E9E9E" />
        </View>
      </View>

      {/* Document Cards */}
      {docs.map(doc => (
        <View key={doc.id} style={styles.docCard}>
          <View style={[styles.docIconBox, {backgroundColor: doc.bg}]}>
            <Icon name={doc.icon} size={22} color={doc.color} />
          </View>
          <View style={styles.docInfo}>
            <Text style={styles.docName}>{doc.name}</Text>
            <Text style={styles.docDesc}>{doc.desc}</Text>
          </View>
          <View style={styles.docRight}>
            <View style={[styles.docStatusBadge, {backgroundColor: doc.bg}]}>
              <Icon
                name={doc.status === 'Verified' ? 'check-circle' : doc.status === 'Pending' ? 'clock-outline' : 'upload'}
                size={12}
                color={doc.color}
              />
              <Text style={[styles.docStatusText, {color: doc.color}]}>  {doc.status}</Text>
            </View>
            {doc.status === 'Upload' && (
              <Pressable style={styles.uploadBtn}>
                <Icon name="upload" size={14} color="#FFFFFF" />
                <Text style={styles.uploadBtnText}> Upload</Text>
              </Pressable>
            )}
          </View>
        </View>
      ))}

      {/* Tips */}
      <View style={styles.tipsCard}>
        <View style={styles.tipsHeader}>
          <Icon name="lightbulb-outline" size={18} color="#4A90E2" />
          <Text style={styles.tipsTitle}>  Upload Tips</Text>
        </View>
        <View style={styles.tipRow}><Icon name="circle-small" size={14} color={colors.muted} /><Text style={styles.tipsText}>Clear, high-resolution images only</Text></View>
        <View style={styles.tipRow}><Icon name="circle-small" size={14} color={colors.muted} /><Text style={styles.tipsText}>Maximum file size: 5 MB per document</Text></View>
        <View style={styles.tipRow}><Icon name="circle-small" size={14} color={colors.muted} /><Text style={styles.tipsText}>Accepted formats: JPG, PNG, PDF</Text></View>
      </View>
    </>
  );
}

function ProgressStat({label, count, color}) {
  return (
    <View style={styles.progressStatItem}>
      <View style={[styles.progressStatDot, {backgroundColor: color}]} />
      <Text style={styles.progressStatCount}>{count}</Text>
      <Text style={styles.progressStatLabel}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────
// Detail Field Component
// ─────────────────────────────────────────────
function DetailField({icon, label, value, editing, onChange}) {
  return (
    <View style={styles.detailField}>
      <View style={styles.detailFieldHeader}>
        <Icon name={icon} size={13} color={colors.red} />
        <Text style={styles.detailLabel}>  {label}</Text>
      </View>
      {editing && onChange ? (
        <TextInput
          value={value}
          onChangeText={onChange}
          style={styles.detailInput}
        />
      ) : (
        <Text style={styles.detailValue}>{value}</Text>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},

  // ── Header ──
  header: {
    backgroundColor: colors.red,
    paddingTop: 24,
    paddingBottom: 0,
  },
  profileCard: {alignItems: 'center', paddingBottom: 16, paddingHorizontal: 20},
  avatarContainer: {position: 'relative', marginBottom: 10},
  avatar: {
    width: 82, height: 82, borderRadius: 41,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)',
  },
  avatarInitials: {color: '#FFFFFF', fontSize: 30, fontWeight: '900'},
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#333',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.red,
  },
  
  // ── Notification Button (Top-right of profile card) ──
  notificationBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  notifBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.red,
    paddingHorizontal: 4,
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 13,
  },

  profileName: {color: '#FFFFFF', fontSize: 21, fontWeight: '900', marginBottom: 4},
  idRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 8},
  profileMeta: {color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600'},
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
  },
  verifiedText: {color: '#FFFFFF', fontSize: 12, fontWeight: '700'},

  // ── Tabs ──
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 0,
    paddingTop: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {borderBottomColor: '#FFFFFF'},
  tabText: {fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.6)', textAlign: 'center'},
  tabTextActive: {color: '#FFFFFF', fontWeight: '900'},

  // ── Content ──
  content: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 32,
  },

  // ── Section ──
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 14,
    ...shadow,
  },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  sectionTitleRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 14},
  sectionIconBox: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: 'rgba(197,31,43,0.1)',
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  sectionTitle: {color: colors.text, fontSize: 15, fontWeight: '800'},
  editBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(197,31,43,0.08)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
  },
  editBtnSave: {backgroundColor: 'rgba(76,175,80,0.1)'},
  editBtnText: {color: colors.red, fontSize: 12, fontWeight: '700'},

  // ── Details Grid ──
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
    rowGap: 10,
  },
  detailField: {
    width: '48.5%',
    backgroundColor: colors.bg,
    borderRadius: 12,
    padding: 11,
    borderWidth: 1,
    borderColor: colors.line,
  },
  detailFieldHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 5},
  detailLabel: {color: colors.muted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4},
  detailValue: {color: colors.text, fontSize: 13, fontWeight: '700'},
  detailInput: {
    backgroundColor: '#FFFFFF', borderWidth: 1.5,
    borderColor: colors.red, borderRadius: 8,
    paddingVertical: 6, paddingHorizontal: 8,
    color: colors.text, fontSize: 13,
  },

  // ── Address ──
  addressBox: {
    backgroundColor: colors.bg, borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: colors.line,
  },
  addressLabelRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 6},
  addressLabel: {color: colors.muted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4},
  addressValue: {color: colors.text, fontSize: 13, fontWeight: '600', lineHeight: 20},
  addressInput: {
    backgroundColor: '#FFFFFF', borderWidth: 1.5,
    borderColor: colors.red, borderRadius: 8,
    padding: 8, color: colors.text, fontSize: 13, minHeight: 60,
  },

  // ── Notifications ──
  notifGroupCard: {
    borderRadius: 14, borderWidth: 1, borderColor: colors.line,
    marginBottom: 10, overflow: 'hidden',
  },
  notifGroupHeader: {
    flexDirection: 'row', alignItems: 'center',
    padding: 13, backgroundColor: '#FFFFFF',
  },
  notifGroupIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginRight: 11,
  },
  notifGroupInfo: {flex: 1},
  notifGroupLabel: {color: colors.text, fontSize: 14, fontWeight: '800'},
  notifGroupSub: {color: colors.muted, fontSize: 11, marginTop: 1},
  notifGroupRight: {flexDirection: 'row', alignItems: 'center'},
  notifCountBadge: {paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8},
  notifCountText: {fontSize: 11, fontWeight: '800'},
  notifItemsContainer: {borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: '#FAFAFA'},
  notifItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 13, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  notifItemIcon: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: '#FFFFFF', alignItems: 'center',
    justifyContent: 'center', marginRight: 10,
    borderWidth: 1, borderColor: colors.line,
  },
  notifItemInfo: {flex: 1},
  notifLabel: {color: colors.text, fontSize: 13, fontWeight: '700'},
  notifDesc: {color: colors.muted, fontSize: 11, marginTop: 1},

  // ── Bank ──
  encBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(76,175,80,0.08)',
    borderWidth: 1, borderColor: 'rgba(76,175,80,0.25)',
    borderRadius: 14, padding: 13, marginBottom: 14,
  },
  encIconBox: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(76,175,80,0.15)',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  encTitle: {color: '#2E7D32', fontSize: 13, fontWeight: '800'},
  encDesc: {color: '#4CAF50', fontSize: 11, marginTop: 2},
  bankCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    padding: 0, marginBottom: 13, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.line, ...shadow,
  },
  bankCardPrimary: {borderColor: colors.orange, borderWidth: 1.5},
  bankCardHeader: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9F9F9',
    padding: 13, borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  bankLogoBox: {
    width: 42, height: 42, borderRadius: 11,
    backgroundColor: 'rgba(242,106,33,0.12)',
    alignItems: 'center', justifyContent: 'center', marginRight: 11,
  },
  bankName: {color: colors.text, fontSize: 14, fontWeight: '800'},
  bankBranch: {color: colors.muted, fontSize: 11, marginTop: 2},
  primaryBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(76,175,80,0.12)',
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8,
  },
  primaryText: {color: '#2E7D32', fontSize: 11, fontWeight: '800'},
  bankInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 12,
    rowGap: 8,
  },
  bankInfoCell: {
    width: '48.5%',
    backgroundColor: colors.bg,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  bankInfoLabel: {color: colors.muted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4},
  bankInfoValue: {color: colors.text, fontSize: 13, fontWeight: '700'},
  accountNoText: {letterSpacing: 1.5},
  bankActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  bankBtnOutline: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.orange,
    paddingVertical: 9, borderRadius: 10,
  },
  bankBtnEdit: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.red,
    paddingVertical: 9, borderRadius: 10,
  },
  bankBtnDelete: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#FFCDD2',
    backgroundColor: 'rgba(244,67,54,0.05)',
    paddingVertical: 9, borderRadius: 10,
  },
  bankBtnText: {color: colors.red, fontSize: 12, fontWeight: '700'},
  addBankBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.red, borderRadius: 14, padding: 14, marginBottom: 8,
  },
  addBankIconBox: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  addBankText: {color: '#FFFFFF', fontSize: 14, fontWeight: '800'},

  // ── Documents ──
  progressCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    padding: 16, marginBottom: 14, ...shadow,
    borderWidth: 1, borderColor: colors.line,
  },
  progressTopRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14},
  progressLabel: {color: colors.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4},
  progressFraction: {color: colors.text, fontSize: 22, fontWeight: '900'},
  progressCircle: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: 'rgba(76,175,80,0.12)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#4CAF50',
  },
  progressPct: {color: '#2E7D32', fontSize: 14, fontWeight: '900'},
  progressTrack: {height: 8, backgroundColor: '#F0F0F0', borderRadius: 4, overflow: 'hidden', marginBottom: 12},
  progressFill: {height: '100%', backgroundColor: '#4CAF50', borderRadius: 4},
  progressStats: {flexDirection: 'row', justifyContent: 'space-evenly', marginTop: 4},
  progressStatItem: {flexDirection: 'row', alignItems: 'center', gap: 5},
  progressStatDot: {width: 8, height: 8, borderRadius: 4},
  progressStatCount: {color: colors.text, fontSize: 13, fontWeight: '800'},
  progressStatLabel: {color: colors.muted, fontSize: 11},
  docCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 14,
    padding: 13, marginBottom: 10,
    borderWidth: 1, borderColor: colors.line, ...shadow,
  },
  docIconBox: {
    width: 46, height: 46, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  docInfo: {flex: 1},
  docName: {color: colors.text, fontSize: 14, fontWeight: '800', marginBottom: 3},
  docDesc: {color: colors.muted, fontSize: 11},
  docRight: {alignItems: 'flex-end', gap: 6},
  docStatusBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8,
  },
  docStatusText: {fontSize: 11, fontWeight: '800'},
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.red,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  uploadBtnText: {color: '#FFFFFF', fontSize: 11, fontWeight: '700'},
  tipsCard: {
    backgroundColor: 'rgba(74,144,226,0.07)',
    borderWidth: 1, borderColor: 'rgba(74,144,226,0.25)',
    borderRadius: 12, padding: 13, marginTop: 4,
  },
  tipsHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 8},
  tipsTitle: {color: '#4A90E2', fontSize: 13, fontWeight: '800'},
  tipRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 3},
  tipsText: {color: colors.muted, fontSize: 12},

  // ── Logout ──
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(244,67,54,0.08)',
    borderWidth: 1, borderColor: 'rgba(244,67,54,0.25)',
    borderRadius: 14, padding: 14, marginTop: 8, marginBottom: 16,
  },
  logoutText: {color: '#F44336', fontSize: 15, fontWeight: '800', marginLeft: 8},
  versionText: {color: colors.muted, fontSize: 12, textAlign: 'center', marginBottom: 10},
});

export default ProfilePage;
