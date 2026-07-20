/**
 * ProfilePage.js – Sri Chakra Industries Dealer App
 * Curved wave header navbar + dynamic data from registration API
 */

import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Defs, LinearGradient, Path, Rect, Stop} from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import authService from './services/authService';
import dealerService from './services/dealerService';

const {width: W} = Dimensions.get('window');

const RED      = '#E05565';
const RED_SOFT = '#FFF5F6';
const DARK     = '#1A2332';
const GREY     = '#6B7280';
const LINE     = '#F0F0F0';
const BG       = '#F5F7FA';
const WHITE    = '#FFFFFF';

/* ─── Curved Wave Header ───────────────────────────────────── */
const HEADER_H = 175;

function WaveHeader({children}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {toValue: 1, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: true}).start();
  }, [anim]);

  const wavePath  = `M 0,${HEADER_H - 28} C ${W*0.28},${HEADER_H+22} ${W*0.72},${HEADER_H-48} ${W},${HEADER_H-16} L ${W},${HEADER_H} L 0,${HEADER_H} Z`;
  const innerWave = `M 0,${HEADER_H-40} C ${W*0.30},${HEADER_H+8} ${W*0.68},${HEADER_H-58} ${W},${HEADER_H-28} L ${W},${HEADER_H-16} C ${W*0.72},${HEADER_H-48} ${W*0.28},${HEADER_H+22} 0,${HEADER_H-28} Z`;

  return (
    <View style={pS.header}>
      <View style={StyleSheet.absoluteFill}>
        <Svg width={W} height={HEADER_H} viewBox={`0 0 ${W} ${HEADER_H}`} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="hbg" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%"   stopColor="#C94455" />
              <Stop offset="50%"  stopColor="#D44D5E" />
              <Stop offset="100%" stopColor="#E05565" />
            </LinearGradient>
            <LinearGradient id="shine" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.13" />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.00" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={W} height={HEADER_H} fill="url(#hbg)" />
          <Rect x="0" y="0" width={W} height={HEADER_H} fill="url(#shine)" />
          <Path d={innerWave} fill="rgba(255,255,255,0.07)" />
          <Path d={wavePath}  fill={BG} />
        </Svg>
      </View>
      <Animated.View style={[pS.headerContent, {opacity: anim}]}>
        {children}
      </Animated.View>
    </View>
  );
}

/* ─── Avatar circle ──────────────────────────────────────── */
function Avatar({uri, initials, size = 86}) {
  return (
    <View style={[avS.wrap, {width:size, height:size, borderRadius:size/2}]}>
      {uri
        ? <Image source={{uri}} style={{width:size, height:size, borderRadius:size/2}} resizeMode="cover" />
        : <Text style={[avS.txt, {fontSize:size*0.32}]}>{initials}</Text>
      }
    </View>
  );
}
const avS = StyleSheet.create({
  wrap: {backgroundColor:'rgba(255,255,255,0.22)', borderWidth:3,
         borderColor:'rgba(255,255,255,0.55)', overflow:'hidden',
         alignItems:'center', justifyContent:'center'},
  txt:  {color:WHITE, fontWeight:'900', letterSpacing:1},
});

/* ─── FormField (read-only display) ─────────────────────── */
function FormField({label, value, placeholder, keyboardType, last}) {
  return (
    <View style={[ffS.wrap, last && {marginBottom:0}]}>
      <Text style={ffS.label}>{label}</Text>
      <View style={[ffS.inputRow, ffS.inputReadOnly]}>
        <TextInput
          style={[ffS.input, {color: DARK}]}
          value={value}
          placeholder={placeholder || ""}
          placeholderTextColor="#C0C0C0"
          keyboardType={keyboardType || 'default'}
          editable={false}
          autoCapitalize="words"
        />
      </View>
    </View>
  );
}
const ffS = StyleSheet.create({
  wrap:        {marginBottom:14},
  label:       {fontSize:10, fontWeight:'700', color:GREY,
                 textTransform:'uppercase', letterSpacing:0.5, marginBottom:6},
  inputRow:    {flexDirection:'row', alignItems:'center', borderWidth:1.5,
                 borderColor:LINE, borderRadius:12, backgroundColor:'#FAFAFA',
                 overflow:'hidden'},
  inputReadOnly:{borderColor:'#EAEAEA', backgroundColor:'#F7F7F7'},
  input:       {flex:1, height:48, paddingHorizontal:16, fontSize:14,
                 fontWeight:'600', color:DARK},
});

/* ─── SectionCard ───────────────────────────────────────── */
function SectionCard({icon, title, children}) {
  return (
    <View style={scS.card}>
      <View style={scS.header}>
        <View style={scS.iconBox}><Icon name={icon} size={16} color={RED}/></View>
        <Text style={scS.title}>{title}</Text>
      </View>
      {children}
    </View>
  );
}
const scS = StyleSheet.create({
  card:    {backgroundColor:WHITE, borderRadius:18, paddingHorizontal:16,
             paddingTop:16, paddingBottom:6, marginBottom:14,
             shadowColor:'#000', shadowOffset:{width:0,height:2},
             shadowOpacity:0.07, shadowRadius:8, elevation:3,
             borderWidth:1, borderColor:'rgba(0,0,0,0.04)'},
  header:  {flexDirection:'row', alignItems:'center', marginBottom:12},
  iconBox: {width:30, height:30, borderRadius:8, backgroundColor:RED_SOFT,
             alignItems:'center', justifyContent:'center', marginRight:10},
  title:   {fontSize:15, fontWeight:'800', color:DARK},
});

/* ─── LinkRow ───────────────────────────────────────────── */
function LinkRow({icon, iconColor, iconBg, label, sub, onPress, last}) {
  return (
    <Pressable onPress={onPress}
      style={({pressed}) => [lkS.row, last && {borderBottomWidth:0}, pressed && {opacity:0.7}]}>
      <View style={[lkS.iconBox, {backgroundColor:iconBg||RED_SOFT}]}>
        <Icon name={icon} size={17} color={iconColor||RED}/>
      </View>
      <View style={lkS.text}>
        <Text style={lkS.label}>{label}</Text>
        {sub ? <Text style={lkS.sub}>{sub}</Text> : null}
      </View>
      <Icon name="chevron-right" size={18} color="#CCCCCC"/>
    </Pressable>
  );
}
const lkS = StyleSheet.create({
  row:     {flexDirection:'row', alignItems:'center', paddingVertical:13,
             borderBottomWidth:1, borderBottomColor:LINE},
  iconBox: {width:36, height:36, borderRadius:10, alignItems:'center',
             justifyContent:'center', marginRight:13},
  text:    {flex:1},
  label:   {fontSize:14, fontWeight:'700', color:DARK},
  sub:     {fontSize:11, color:GREY, marginTop:2},
});

/* ─── Change Password Modal ─────────────────────────────── */
function ChangePasswordModal({visible, onClose}) {
  const [cur,  setCur]  = useState('');
  const [nw,   setNw]   = useState('');
  const [con,  setCon]  = useState('');
  const [sCur, setSCur] = useState(false);
  const [sNw,  setSNw]  = useState(false);
  const [sCon, setSCon] = useState(false);
  const [busy, setBusy] = useState(false);

  const reset = () => { setCur(''); setNw(''); setCon(''); };

  const submit = async () => {
    if (!cur || !nw || !con) { return; }
    if (nw.length < 6)       { return; }
    if (nw !== con)          { return; }
    setBusy(true);
    try {
      const res = await authService.changePassword(cur, nw);
      if (res.success) {
        reset(); onClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const fields = [
    {label:'Current Password', val:cur, set:setCur, show:sCur, toggle:()=>setSCur(v=>!v)},
    {label:'New Password',     val:nw,  set:setNw,  show:sNw,  toggle:()=>setSNw(v=>!v)},
    {label:'Confirm Password', val:con, set:setCon, show:sCon, toggle:()=>setSCon(v=>!v)},
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={mS.overlay}>
        <View style={mS.card}>
          <View style={mS.head}>
            <View style={mS.headIcon}><Icon name="lock-reset" size={22} color={RED}/></View>
            <View style={{flex:1, marginLeft:12}}>
              <Text style={mS.headTitle}>Change Password</Text>
              <Text style={mS.headSub}>Update your login password</Text>
            </View>
            <Pressable onPress={()=>{reset();onClose();}} hitSlop={10}>
              <Icon name="close" size={22} color={GREY}/>
            </Pressable>
          </View>
          <View style={mS.divider}/>
          {fields.map((f,i) => (
            <View key={i} style={mS.field}>
              <Text style={mS.fieldLabel}>{f.label}</Text>
              <View style={mS.inputRow}>
                <TextInput value={f.val} onChangeText={f.set}
                  secureTextEntry={!f.show} placeholder="••••••••"
                  placeholderTextColor="#CCC" style={mS.input} autoCapitalize="none"/>
                <Pressable onPress={f.toggle} hitSlop={8} style={mS.eye}>
                  <Icon name={f.show?'eye-off-outline':'eye-outline'} size={18} color={GREY}/>
                </Pressable>
              </View>
            </View>
          ))}
          <Pressable onPress={submit} disabled={busy}
            style={[mS.btn, busy && {opacity:0.55}]}>
            <Icon name="lock-check" size={18} color={WHITE}/>
            <Text style={mS.btnTxt}>{busy ? '  Updating…' : '  Update Password'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const mS = StyleSheet.create({
  overlay:   {flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'flex-end'},
  card:      {backgroundColor:WHITE, borderTopLeftRadius:24, borderTopRightRadius:24,
               paddingHorizontal:20, paddingTop:20, paddingBottom:36},
  head:      {flexDirection:'row', alignItems:'center', marginBottom:14},
  headIcon:  {width:44, height:44, borderRadius:12, backgroundColor:RED_SOFT,
               alignItems:'center', justifyContent:'center'},
  headTitle: {fontSize:17, fontWeight:'800', color:DARK},
  headSub:   {fontSize:12, color:GREY, marginTop:2},
  divider:   {height:1, backgroundColor:LINE, marginBottom:16},
  field:     {marginBottom:14},
  fieldLabel:{fontSize:12, fontWeight:'700', color:DARK, marginBottom:6},
  inputRow:  {flexDirection:'row', alignItems:'center', borderWidth:1.5,
               borderColor:LINE, borderRadius:12, backgroundColor:'#FAFAFA'},
  input:     {flex:1, height:48, paddingHorizontal:14, fontSize:15, color:DARK},
  eye:       {paddingHorizontal:12},
  btn:       {flexDirection:'row', alignItems:'center', justifyContent:'center',
               height:52, borderRadius:14, backgroundColor:RED, marginTop:6,
               shadowColor:RED, shadowOffset:{width:0,height:5},
               shadowOpacity:0.28, shadowRadius:10, elevation:5},
  btnTxt:    {color:WHITE, fontSize:15, fontWeight:'800'},
});

/* ═══════════════════════════════════════════════════════════
   MAIN EXPORT
═══════════════════════════════════════════════════════════ */

// ── Map every API field returned by GET /api/dealer/profile to form state ──
// Backend profile route returns:
//   _id, name, mobile, email, address, city, state, pincode,
//   dealerCode, zone, status, photo, isActive, isVerified,
//   creditLimit, createdAt
function mapDealerToForm(d) {
  // Helper function to get value or empty string
  const getValue = (val) => {
    if (val === null || val === undefined) return '';
    const strVal = String(val).trim();
    return strVal;
  };

  if (!d || typeof d !== 'object') {
    return {
      name: '', phone: '', email: '',
      address: '', city: '', state: '', pincode: '',
      gstin: '', panNumber: '', zone: 'Not Assigned', creditLimit: 0, outstandingAmount: 0,
    };
  }
  return {
    name:               getValue(d.name || d.dealerName),
    phone:              getValue(d.mobile || d.phone),
    email:              getValue(d.email),
    address:            getValue(d.address),
    city:               getValue(d.city),
    state:              getValue(d.state),
    pincode:            getValue(d.pincode),
    gstin:              getValue(d.gstin || d.gstNumber),
    panNumber:          getValue(d.panNumber),
    zone:               getValue(d.zone) || 'Not Assigned',
    creditLimit:        Number(d.creditLimit) || 0,
    outstandingAmount:  Number(d.outstandingAmount) || 0,
  };
}

const _EMPTY_FORM = mapDealerToForm(null); // kept for reference

export default function ProfilePage({dealer: dealerProp, onLogout, onBack, onNavigate}) {
  const [pwdModal, setPwdModal] = useState(false);
  const [loading,  setLoading]  = useState(true);

  // form holds all display values — seeded immediately from dealerProp, refreshed from API
  const [form,     setForm]     = useState(() => mapDealerToForm(dealerProp));
  // photoUri is kept separate because it may be a long base64 string
  const [photoUri, setPhotoUri] = useState(
    () => dealerProp?.photo || dealerProp?.profilePhoto || dealerProp?.image || null
  );

  // apply a dealer object from any source (prop or API) into state
  const applyDealer = React.useCallback((d) => {
    if (!d) return;
    setForm(mapDealerToForm(d));
    setPhotoUri(d.photo || d.profilePhoto || d.image || null);
  }, []);

  // When dealerProp arrives / changes (parent re-renders after login), apply it
  // but only if we haven't yet received a fresher API response
  const hasApiData = React.useRef(false);
  useEffect(() => {
    if (dealerProp && !hasApiData.current) {
      applyDealer(dealerProp);
    }
  }, [dealerProp, applyDealer]);

  // Fetch the logged-in dealer's profile from the backend using the saved token
  useEffect(() => {
    let cancelled = false;
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await dealerService.getProfile();
        if (cancelled) return;
        // Backend getDealerProfile returns { success: true, data: publicDealer(dealer) }
        const data = res?.data || res?.dealer || null;
        if (res?.success && data) {
          hasApiData.current = true;
          applyDealer(data);
        }
        // if API returns nothing useful, dealerProp is already in state — no action needed
      } catch (err) {
        if (!cancelled) {
          console.warn('[ProfilePage] getProfile failed, using cached data:', err.message);
        }
        // AsyncStorage fallback is handled inside dealerService.getProfile()
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchProfile();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived values for header display
  const name     = form.name  || '';
  const mobile   = form.phone || '';
  const initials = name.trim()
    ? name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'D';

  // Only show full-screen spinner when we truly have zero data
  if (loading && !name && !mobile) {
    return (
      <SafeAreaView style={[pS.screen, {justifyContent:'center', alignItems:'center'}]} edges={['bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="#C94455"/>
        <ActivityIndicator size="large" color={RED}/>
        <Text style={{marginTop:12, color:GREY, fontSize:14}}>Loading profile…</Text>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={pS.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor="#C94455"/>

      {/* ── CURVED WAVE HEADER ── */}
      <WaveHeader>
        {/* Back button */}
        {onBack && (
          <Pressable onPress={onBack} style={pS.backBtn} hitSlop={10}>
            <Icon name="arrow-left" size={22} color={WHITE}/>
          </Pressable>
        )}
        {/* Bell button */}
        {onNavigate && (
          <Pressable onPress={()=>onNavigate('notifications')} style={pS.bellBtn} hitSlop={10}>
            <Icon name="bell-ring-outline" size={22} color={WHITE}/>
          </Pressable>
        )}

        {/* Avatar */}
        <View style={pS.avatarWrap}>
          <Avatar uri={photoUri} initials={initials} size={72}/>
          {photoUri && (
            <View style={pS.photoTick}>
              <Icon name="check-circle" size={14} color={WHITE}/>
            </View>
          )}
        </View>

        <Text style={pS.hName}>{name || 'Dealer'}</Text>
        {mobile ? <Text style={pS.hMobile}>+91 {mobile}</Text> : null}
      </WaveHeader>

      {/* ── SCROLL BODY ── */}
      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={pS.body} keyboardShouldPersistTaps="handled">

        {/* ── 1. Personal Details Card ── */}
        <View style={pS.detailsCard}>
          <View style={pS.cardHeader}>
            <View style={pS.cardIconBox}>
              <Icon name="account-circle-outline" size={16} color={RED}/>
            </View>
            <Text style={pS.cardTitle}>Personal Details</Text>
          </View>
          <View style={pS.formWrap}>
            <FormField label="Dealer Name"    value={form.name}       placeholder="—" />
            <FormField label="Mobile Number"  value={form.phone}      placeholder="—" keyboardType="phone-pad"/>
            <FormField label="Email ID"       value={form.email}      placeholder="—" keyboardType="email-address"/>
            <FormField label="Address"        value={form.address}    placeholder="—" />
            <View style={pS.twoCol}>
              <View style={{flex:1, marginRight:8}}>
                <FormField label="City"  value={form.city}  placeholder="—" last/>
              </View>
              <View style={{flex:1}}>
                <FormField label="State" value={form.state} placeholder="—" last/>
              </View>
            </View>
            <FormField label="Pincode"    value={form.pincode}   placeholder="—" keyboardType="number-pad"/>
            <FormField label="GST Number" value={form.gstin}     placeholder="—" />
            <FormField label="PAN Number" value={form.panNumber} placeholder="—" />
            <FormField label="Zone"       value={form.zone}      placeholder="—" />
            <View style={pS.twoCol}>
              <View style={{flex:1, marginRight:8}}>
                <FormField label="Credit Limit"  value={`₹${(form.creditLimit || 0).toLocaleString('en-IN')}`}     placeholder="—" last/>
              </View>
              <View style={{flex:1}}>
                <FormField label="Outstanding"   value={`₹${(form.outstandingAmount || 0).toLocaleString('en-IN')}`} placeholder="—" last/>
              </View>
            </View>
          </View>
        </View>

        {/* ── 2. More Options ── */}
        <SectionCard icon="view-grid-outline" title="More Options">
          <LinkRow icon="bell-ring-outline" iconColor="#1565C0" iconBg="rgba(21,101,192,0.10)"
            label="Notifications" sub="Alerts & updates"
            onPress={()=>onNavigate&&onNavigate('notifications')}/>
          <LinkRow icon="headset" iconColor="#00695C" iconBg="rgba(0,105,92,0.10)"
            label="Support" sub="Help & customer care"
            onPress={()=>onNavigate&&onNavigate('support')}/>
          <LinkRow icon="chart-bar" iconColor="#6A1B9A" iconBg="rgba(106,27,154,0.10)"
            label="Reports" sub="Sales & analytics"
            onPress={()=>onNavigate&&onNavigate('reports')}/>
          <LinkRow icon="lock-reset" iconColor={RED} iconBg={RED_SOFT}
            label="Change Password" sub="Update your login password"
            onPress={()=>setPwdModal(true)} last/>
        </SectionCard>

        {/* ── 4. Sign Out ── */}
        <Pressable onPress={onLogout} style={pS.logoutBtn}>
          <Icon name="logout-variant" size={19} color="#F44336"/>
          <Text style={pS.logoutTxt}>  Sign Out</Text>
        </Pressable>

        
      </ScrollView>

      <ChangePasswordModal visible={pwdModal} onClose={()=>setPwdModal(false)}/>
    </KeyboardAvoidingView>
  );
}

/* ─── Main Styles ────────────────────────────────────────── */
const pS = StyleSheet.create({
  screen: {flex:1, backgroundColor:BG},

  /* ── Wave header ── */
  header: {
    width:'100%', height:HEADER_H,
    backgroundColor:'#C94455', overflow:'hidden',
  },
  headerContent: {
    flex:1, alignItems:'center', justifyContent:'center',
    paddingBottom:24, paddingTop:10,
  },

  /* Back / bell buttons */
  backBtn: {position:'absolute', top:14, left:14, width:38, height:38,
             borderRadius:19, backgroundColor:'rgba(255,255,255,0.18)',
             alignItems:'center', justifyContent:'center', zIndex:10},
  bellBtn: {position:'absolute', top:14, right:14, width:38, height:38,
             borderRadius:19, backgroundColor:'rgba(255,255,255,0.18)',
             alignItems:'center', justifyContent:'center', zIndex:10},

  /* Avatar */
  avatarWrap: {marginBottom:10, position:'relative'},
  photoTick:  {position:'absolute', bottom:2, right:2, width:22, height:22,
                borderRadius:11, backgroundColor:'#22C55E', borderWidth:2,
                borderColor:WHITE, alignItems:'center', justifyContent:'center'},

  /* Header text */
  hName:    {color:WHITE, fontSize:20, fontWeight:'900', textAlign:'center', marginBottom:2},
  hMobile:  {color:'rgba(255,255,255,0.75)', fontSize:12, fontWeight:'600', marginBottom:4},
  hCodeRow: {flexDirection:'row', alignItems:'center', marginBottom:8},
  hCode:    {color:'rgba(255,255,255,0.80)', fontSize:12, fontWeight:'600'},

  /* Scroll body */
  body: {paddingHorizontal:14, paddingTop:16, paddingBottom:40},

  /* Personal Details card */
  detailsCard: {
    backgroundColor:WHITE, borderRadius:18, marginBottom:14,
    shadowColor:'#000', shadowOffset:{width:0,height:2},
    shadowOpacity:0.07, shadowRadius:8, elevation:3,
    borderWidth:1, borderColor:'rgba(0,0,0,0.04)', overflow:'hidden',
  },
  cardHeader: {
    flexDirection:'row', alignItems:'center',
    paddingHorizontal:16, paddingTop:16, paddingBottom:12,
    borderBottomWidth:1, borderBottomColor:LINE,
  },
  cardIconBox: {width:30, height:30, borderRadius:8, backgroundColor:RED_SOFT,
                 alignItems:'center', justifyContent:'center', marginRight:10},
  cardTitle:   {fontSize:15, fontWeight:'800', color:DARK},
  formWrap:    {paddingHorizontal:16, paddingTop:16, paddingBottom:8},
  twoCol:      {flexDirection:'row'},

  /* Logout */
  logoutBtn: {flexDirection:'row', alignItems:'center', justifyContent:'center',
               marginTop:4, marginBottom:12, paddingVertical:15,
               backgroundColor:WHITE, borderRadius:14,
               borderWidth:1.5, borderColor:'#FFCDD2',
               shadowColor:'#000', shadowOffset:{width:0,height:2},
               shadowOpacity:0.06, shadowRadius:6, elevation:2},
  logoutTxt: {fontSize:15, fontWeight:'800', color:'#F44336'},
  version:   {textAlign:'center', fontSize:11, color:GREY, marginTop:4},
});
