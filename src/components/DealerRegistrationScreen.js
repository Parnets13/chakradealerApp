/**
 * DealerRegistrationScreen.js – Sri Chakra Industries
 * - No tick icons on fields
 * - Success shown as auto-closing popup (2s) then redirect to login
 * - Re-registration logic: pending/approved/rejected handled properly
 * - Added: GST Number, PAN Number, Credit Limit, Outstanding Amount, Zone
 */

import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
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
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Defs, LinearGradient, Path, Rect, Stop} from 'react-native-svg';
import authService from './services/authService';
import ProfilePhotoPicker from './ProfilePhotoPicker';
import {TextInput} from 'react-native';

const {width: W} = Dimensions.get('window');

const R_MID   = '#E05565';
const PINK_BG = '#FFF5F6';
const DARK    = '#1A1A1A';
const GREY    = '#6B7280';

const IC = {
  person:   'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  phone:    'M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24c1.12.28 2.28.43 3.48.43a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.01l-2.2 2.21z',
  email:    'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6',
  location: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  city:     'M3 21h18M3 7v14M21 7v14M6 21V3l6 4 6-4v18M9 21v-4h6v4',
  flag:     'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7',
  pin:      'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zM12 11.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z',
  check:    'M9 12l2 2 4-4',
  shield:   'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  gst:      'M9 14l2 2 4-4M7 21h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z',
  pan:      'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3z',
  credit:   'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  zone:     'M17.657 16.657L13.414 20.9a1.998 1.998 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0zM15 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
};

function SvgIco({d, size = 18, color = GREY, sw = 1.8}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={d} stroke={color} strokeWidth={sw}
        strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

/* ── Wave Header ── */
const HEADER_H = 160;
function WaveHeader() {
  const contentO  = useRef(new Animated.Value(0)).current;
  const contentY  = useRef(new Animated.Value(-20)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentO, {toValue:1, duration:700, easing:Easing.out(Easing.quad), useNativeDriver:true}),
      Animated.timing(contentY, {toValue:0, duration:650, delay:80, easing:Easing.out(Easing.back(1.4)), useNativeDriver:true}),
      Animated.spring(logoScale, {toValue:1, delay:100, friction:7, tension:55, useNativeDriver:true}),
    ]).start();
  }, [contentO, contentY, logoScale]);
  const wavePath  = `M 0,${HEADER_H-30} C ${W*0.28},${HEADER_H+24} ${W*0.72},${HEADER_H-50} ${W},${HEADER_H-18} L ${W},${HEADER_H} L 0,${HEADER_H} Z`;
  const innerWave = `M 0,${HEADER_H-42} C ${W*0.30},${HEADER_H+10} ${W*0.68},${HEADER_H-60} ${W},${HEADER_H-30} L ${W},${HEADER_H-18} C ${W*0.72},${HEADER_H-50} ${W*0.28},${HEADER_H+24} 0,${HEADER_H-30} Z`;
  return (
    <View style={s.header}>
      <View style={StyleSheet.absoluteFill}>
        <Svg width={W} height={HEADER_H} viewBox={`0 0 ${W} ${HEADER_H}`} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%"  stopColor="#C94455"/>
              <Stop offset="50%" stopColor="#D44D5E"/>
              <Stop offset="100%" stopColor="#E05565"/>
            </LinearGradient>
            <LinearGradient id="shine" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.15"/>
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.00"/>
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={W} height={HEADER_H} fill="url(#bg)"/>
          <Rect x="0" y="0" width={W} height={HEADER_H} fill="url(#shine)"/>
          <Path d={innerWave} fill="#F4F4F4"/>
          <Path d={wavePath}  fill="#F4F4F4"/>
        </Svg>
      </View>
      <Animated.View style={[s.headerContent, {opacity:contentO, transform:[{translateY:contentY},{scale:logoScale}]}]}>
        <View style={s.headerLeft}>
          <Text style={s.headerGreeting}>Welcome 👋</Text>
          <Text style={s.headerTitle}>Dealer Registration</Text>
          <View style={s.headerDivider}/>
          <Text style={s.headerSub}>Sri Chakra Industries</Text>
        </View>
        <View style={s.headerLogoCard}>
          <Image source={require('./assets/sri-chakra-logo.png')} style={s.headerLogo} resizeMode="contain"/>
        </View>
      </Animated.View>
    </View>
  );
}

/* ── Field — same style as original, no tick icon ── */
function Field({label, value, onChange, placeholder, keyboard, maxLen, icon, error, optional, noCapitalize, hint}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={s.fw}>
      <View style={s.flr}>
        <Text style={s.fl}>{label}</Text>
        {optional
          ? <View style={s.optTag}><Text style={s.optTagT}>optional</Text></View>
          : <Text style={s.freq}> *</Text>}
      </View>
      <View style={[s.fbox, focused && s.fboxOn, !!error && s.fboxErr]}>
        <View style={s.fic}>
          <SvgIco d={icon} size={17} color={focused ? R_MID : error ? '#EF4444' : '#BBBBBB'}/>
        </View>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#CCCCCC"
          keyboardType={keyboard || 'default'}
          maxLength={maxLen}
          autoCapitalize={noCapitalize ? 'none' : 'words'}
          style={s.fi}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
      {!!hint  && !error && <Text style={s.fhint}>{hint}</Text>}
      {!!error && <Text style={s.ferr}>⚠ {error}</Text>}
    </View>
  );
}

/* ── Section divider label ── */
function SectionLabel({title}) {
  return (
    <View style={s.secLabelWrap}>
      <View style={s.secLabelLine}/>
      <Text style={s.secLabelTxt}>{title}</Text>
      <View style={s.secLabelLine}/>
    </View>
  );
}

/* ── Success Popup — auto-closes in 2s ── */
function SuccessPopup({visible, onDone}) {
  const opacity   = useRef(new Animated.Value(0)).current;
  const scale     = useRef(new Animated.Value(0.85)).current;
  const overlayOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    Animated.parallel([
      Animated.timing(overlayOp, {toValue:1, duration:250, useNativeDriver:true}),
      Animated.timing(opacity,   {toValue:1, duration:300, easing:Easing.out(Easing.quad), useNativeDriver:true}),
      Animated.spring(scale,     {toValue:1, friction:7, tension:60, useNativeDriver:true}),
    ]).start();
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(overlayOp, {toValue:0, duration:350, useNativeDriver:true}),
        Animated.timing(opacity,   {toValue:0, duration:300, useNativeDriver:true}),
        Animated.timing(scale,     {toValue:0.90, duration:300, useNativeDriver:true}),
      ]).start(() => onDone());
    }, 2000);
    return () => clearTimeout(timer);
  }, [visible, opacity, scale, overlayOp, onDone]);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[s.popOverlay, {opacity: overlayOp}]}>
        <Animated.View style={[s.popBox, {opacity, transform:[{scale}]}]}>
          <View style={s.popCircle}>
            <SvgIco d={IC.check} size={38} color="#FFF" sw={3.2}/>
          </View>
          <Text style={s.popTitle}>Registration Successful! 🎉</Text>
          <Text style={s.popMsg}>
            Dealer Registration Completed Successfully.
          </Text>
          <View style={s.popRedirectRow}>
            <ActivityIndicator size="small" color="#9CA3AF"/>
            <Text style={s.popRedirectT}>  Redirecting to login…</Text>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN SCREEN
════════════════════════════════════════════════════════════ */
export default function DealerRegistrationScreen({onGoToLogin}) {
  const [form, setForm] = useState({
    dealerName:    '',
    mobile:        '',
    email:         '',
    address:       '',
    city:          '',
    state:         '',
    pincode:       '',
    // ── New fields ──
    gstNumber:     '',
    panNumber:     '',
    creditLimit:   '',
    outstandingAmount: '',
    zone:          '',
  });
  const [photo,     setPhoto]     = useState(null);
  const [errors,    setErrors]    = useState({});
  const [loading,   setLoading]   = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  const fadeY = useRef(new Animated.Value(24)).current;
  const fadeO = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeO, {toValue:1, duration:600, easing:Easing.out(Easing.quad), useNativeDriver:true}),
      Animated.timing(fadeY, {toValue:0, duration:520, easing:Easing.out(Easing.back(1.1)), useNativeDriver:true}),
    ]).start();
  }, [fadeO, fadeY]);

  const set = k => v => setForm(p => ({...p, [k]: v}));

  const validate = () => {
    const e = {};
    if (!form.dealerName.trim())   e.dealerName = 'Dealer name is required';
    if (form.mobile.length !== 10) e.mobile     = 'Enter valid 10-digit mobile';
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
                                   e.email      = 'Enter a valid email address';
    if (!form.address.trim())      e.address    = 'Address is required';
    if (!form.city.trim())         e.city       = 'City is required';
    if (!form.state.trim())        e.state      = 'State is required';
    if (form.pincode.length !== 6) e.pincode    = 'Enter valid 6-digit pincode';
    // GST — optional but if entered must be valid 15-char format
    if (form.gstNumber.trim() && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(form.gstNumber.trim().toUpperCase()))
                                   e.gstNumber  = 'Enter valid 15-digit GST number';
    // PAN — optional but if entered must be valid 10-char format
    if (form.panNumber.trim() && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.panNumber.trim().toUpperCase()))
                                   e.panNumber  = 'Enter valid PAN (e.g. ABCDE1234F)';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      Alert.alert('Incomplete Form', 'Please fix the highlighted fields and try again.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name:              form.dealerName.trim(),
        mobile:            form.mobile.trim(),
        email:             form.email.trim() || undefined,
        address:           form.address.trim(),
        city:              form.city.trim(),
        state:             form.state.trim(),
        pincode:           form.pincode.trim(),
        gstin:             form.gstNumber.trim().toUpperCase() || undefined,
        gstNumber:         form.gstNumber.trim().toUpperCase() || undefined,
        panNumber:         form.panNumber.trim().toUpperCase() || undefined,
        creditLimit:       form.creditLimit.trim() ? Number(form.creditLimit.trim()) : undefined,
        outstandingAmount: form.outstandingAmount.trim() ? Number(form.outstandingAmount.trim()) : undefined,
        zone:              form.zone.trim() || undefined,
      };

      // Attach photo
      if (photo) {
        if (photo.base64) {
          payload.photo = `data:${photo.type || 'image/jpeg'};base64,${photo.base64}`;
        } else if (typeof photo === 'string') {
          payload.photo = photo;
        } else if (photo.uri) {
          payload.photo = photo.uri;
        }
      }

      const res = await authService.registerDealer(payload);

      if (res.success) {
        setShowPopup(true);
      } else {
        Alert.alert('Registration Failed', res.message || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      Alert.alert('Registration Error', err?.message || 'Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.screen} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#C94455"/>

      <SuccessPopup
        visible={showPopup}
        onDone={() => {
          setShowPopup(false);
          onGoToLogin(form.dealerName.trim(), {
            name:              form.dealerName.trim(),
            mobile:            form.mobile.trim(),
            email:             form.email.trim(),
            address:           form.address.trim(),
            city:              form.city.trim(),
            state:             form.state.trim(),
            pincode:           form.pincode.trim(),
            gstin:             form.gstNumber.trim().toUpperCase(),
            gstNumber:         form.gstNumber.trim().toUpperCase(),
            panNumber:         form.panNumber.trim().toUpperCase(),
            creditLimit:       form.creditLimit ? Number(form.creditLimit) : 0,
            outstandingAmount: form.outstandingAmount ? Number(form.outstandingAmount) : 0,
            zone:              form.zone.trim(),
          });
        }}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex:1}}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
          contentContainerStyle={{flexGrow:1}}>

          <WaveHeader/>

          <Animated.View style={{opacity:fadeO, transform:[{translateY:fadeY}]}}>
            <View style={s.card}>

              {/* ── Basic Details ── */}
              <Field label="Dealer Name" value={form.dealerName}
                onChange={set('dealerName')} placeholder="Your full name / dealer name"
                icon={IC.person} error={errors.dealerName}/>

              <Field label="Mobile Number" value={form.mobile}
                onChange={v => set('mobile')(v.replace(/\D/g,''))}
                placeholder="10-digit mobile number"
                keyboard="number-pad" maxLen={10}
                icon={IC.phone} error={errors.mobile} noCapitalize/>

              <Field label="Email ID" value={form.email}
                onChange={set('email')} placeholder="dealer@example.com"
                keyboard="email-address" icon={IC.email} error={errors.email}
              />

              {/* ── Address ── */}
              <Field label="Address" value={form.address}
                onChange={set('address')} placeholder="Shop no, street, area"
                icon={IC.location} error={errors.address}/>

              <View style={s.rowTwo}>
                <View style={{flex:1, marginRight:8}}>
                  <Field label="City" value={form.city}
                    onChange={set('city')} placeholder="City"
                    icon={IC.city} error={errors.city}/>
                </View>
                <View style={{flex:1}}>
                  <Field label="State" value={form.state}
                    onChange={set('state')} placeholder="State"
                    icon={IC.flag} error={errors.state}/>
                </View>
              </View>

              <Field label="Pincode" value={form.pincode}
                onChange={v => set('pincode')(v.replace(/\D/g,''))}
                placeholder="6-digit pincode"
                keyboard="number-pad" maxLen={6}
                icon={IC.pin} error={errors.pincode} noCapitalize/>

              {/* ── Business / Tax Details (new section) ── */}
              <SectionLabel title="Business / Tax Details"/>

              <Field label="GST Number" value={form.gstNumber}
                onChange={v => set('gstNumber')(v.replace(/\s/g,'').toUpperCase())}
                placeholder="e.g. 22AAAAA0000A1Z5"
                icon={IC.gst} error={errors.gstNumber}
                maxLen={15}
                hint="15-digit GST registration number"/>

              <Field label="PAN Number" value={form.panNumber}
                onChange={v => set('panNumber')(v.replace(/\s/g,'').toUpperCase())}
                placeholder="e.g. ABCDE1234F"
                icon={IC.pan} error={errors.panNumber}
               maxLen={10}
                hint="10-character PAN card number"/>

              <View style={s.rowTwo}>
                <View style={{flex:1, marginRight:8}}>
                  <Field label="Credit Limit (₹)" value={form.creditLimit}
                    onChange={v => set('creditLimit')(v.replace(/[^0-9.]/g,''))}
                    placeholder="e.g. 100000"
                    keyboard="numeric" icon={IC.credit}
                 />
                </View>
                <View style={{flex:1}}>
                  <Field label="Outstanding (₹)" value={form.outstandingAmount}
                    onChange={v => set('outstandingAmount')(v.replace(/[^0-9.]/g,''))}
                    placeholder="e.g. 5000"
                    keyboard="numeric" icon={IC.credit}
                    />
                </View>
              </View>

              <Field label="Zone" value={form.zone}
                onChange={set('zone')} placeholder="e.g. North, South, East, West"
                icon={IC.zone} />

              {/* ── Photo ── */}
              <View style={s.fw}>
                <View style={s.flr}>
                  <Text style={s.fl}>Dealer Photo</Text>
                  <View style={s.optTag}><Text style={s.optTagT}>optional</Text></View>
                </View>
                <View style={{alignItems:'center', paddingVertical:8}}>
                  <ProfilePhotoPicker value={photo} onChange={setPhoto} size={100}/>
                </View>
              </View>

              <Pressable onPress={handleSubmit} disabled={loading}
                style={({pressed}) => [s.submitBtn, loading && s.submitOff, pressed && {opacity:0.88}]}>
                {loading
                  ? <ActivityIndicator color="#FFF" size="small"/>
                  : <Text style={s.submitT}>Submit Registration</Text>
                }
              </Pressable>

              <View style={s.secureRow}>
                <SvgIco d={IC.shield} size={13} color="#22C55E"/>
                <Text style={s.secureT}>  Data encrypted · Reviewed by Sri Chakra admin only</Text>
              </View>

            </View>

            <View style={s.loginRow}>
              <Text style={s.loginRowT}>Already registered?  </Text>
              <Pressable onPress={() => onGoToLogin('')} hitSlop={10}>
                <Text style={s.loginRowL}>Login here →</Text>
              </Pressable>
            </View>
          </Animated.View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: {flex:1, backgroundColor:'#F4F4F4'},

  /* Wave Header */
  header:        {width:'100%', height:HEADER_H, backgroundColor:'#C94455', overflow:'hidden'},
  headerContent: {flex:1, flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:20, paddingBottom:36},
  headerLeft:    {flex:1, alignItems:'flex-start', justifyContent:'center'},
  headerGreeting:{fontSize:11, color:'rgba(255,255,255,0.70)', fontWeight:'600', letterSpacing:0.4, marginBottom:4},
  headerTitle:   {fontSize:18, fontWeight:'900', color:'#FFFFFF', letterSpacing:0.3, textShadowColor:'rgba(0,0,0,0.20)', textShadowOffset:{width:0,height:1}, textShadowRadius:3, marginBottom:6},
  headerDivider: {width:24, height:2, borderRadius:2, backgroundColor:'rgba(255,255,255,0.45)', marginBottom:5},
  headerSub:     {fontSize:10, color:'rgba(255,255,255,0.60)', letterSpacing:0.8, textTransform:'uppercase'},
  headerLogoCard:{backgroundColor:'#FFFFFF', borderRadius:18, paddingHorizontal:12, paddingVertical:8, alignItems:'center', justifyContent:'center', shadowColor:'#000', shadowOffset:{width:0,height:3}, shadowOpacity:0.12, shadowRadius:8, elevation:4},
  headerLogo:    {width:W*0.34, height:44},

  /* Form card */
  card: {marginHorizontal:14, marginTop:18, marginBottom:8, backgroundColor:'#FFFFFF', borderRadius:22, paddingHorizontal:18, paddingTop:22, paddingBottom:26, shadowColor:'#C51F2B', shadowOffset:{width:0,height:4}, shadowOpacity:0.08, shadowRadius:16, elevation:5, borderWidth:1, borderColor:'rgba(197,31,43,0.07)'},

  /* Section label */
  secLabelWrap: {flexDirection:'row', alignItems:'center', marginVertical:14},
  secLabelLine: {flex:1, height:1, backgroundColor:'rgba(197,31,43,0.15)'},
  secLabelTxt:  {fontSize:11, fontWeight:'800', color:R_MID, letterSpacing:0.8, textTransform:'uppercase', marginHorizontal:10},

  /* Field */
  fw:      {marginBottom:14},
  flr:     {flexDirection:'row', alignItems:'center', marginBottom:6},
  fl:      {fontSize:12, fontWeight:'700', color:'#374151', letterSpacing:0.3},
  freq:    {fontSize:13, color:R_MID, fontWeight:'700'},
  optTag:  {marginLeft:6, backgroundColor:PINK_BG, paddingHorizontal:7, paddingVertical:2, borderRadius:6, borderWidth:1, borderColor:'rgba(197,31,43,0.15)'},
  optTagT: {fontSize:10, color:R_MID, fontWeight:'600'},
  fbox:    {height:52, borderRadius:13, borderWidth:1.5, borderColor:'#E8E8E8', backgroundColor:'#FAFAFA', flexDirection:'row', alignItems:'center'},
  fboxOn:  {borderColor:R_MID, backgroundColor:'#FFF5F5'},
  fboxErr: {borderColor:'#EF4444', backgroundColor:'#FFF5F5'},
  fic:     {paddingLeft:13, paddingRight:8},
  fi:      {flex:1, fontSize:15, fontWeight:'500', color:DARK, paddingRight:14},
  fhint:   {fontSize:10, color:'#9CA3AF', marginTop:4, marginLeft:2},
  ferr:    {fontSize:11, color:'#EF4444', fontWeight:'500', marginTop:4, marginLeft:2},
  rowTwo:  {flexDirection:'row'},

  /* Submit */
  submitBtn: {height:56, borderRadius:16, backgroundColor:R_MID, alignItems:'center', justifyContent:'center', marginTop:20, shadowColor:R_MID, shadowOffset:{width:0,height:8}, shadowOpacity:0.32, shadowRadius:16, elevation:7},
  submitOff: {opacity:0.55},
  submitT:   {color:'#FFF', fontSize:16, fontWeight:'800', letterSpacing:0.4},

  /* Secure row */
  secureRow: {flexDirection:'row', alignItems:'center', justifyContent:'center', marginTop:14},
  secureT:   {fontSize:11, color:'#9CA3AF'},

  /* Login row */
  loginRow:  {flexDirection:'row', alignItems:'center', justifyContent:'center', paddingVertical:20, paddingBottom:32},
  loginRowT: {fontSize:14, color:GREY},
  loginRowL: {fontSize:14, fontWeight:'800', color:R_MID},

  /* Success Popup */
  popOverlay:    {flex:1, backgroundColor:'rgba(0,0,0,0.60)', alignItems:'center', justifyContent:'center', paddingHorizontal:28},
  popBox:        {width:'100%', backgroundColor:'#FFFFFF', borderRadius:24, paddingHorizontal:24, paddingTop:32, paddingBottom:28, alignItems:'center', shadowColor:'#000', shadowOffset:{width:0,height:16}, shadowOpacity:0.20, shadowRadius:32, elevation:20},
  popCircle:     {width:80, height:80, borderRadius:40, backgroundColor:'#22C55E', alignItems:'center', justifyContent:'center', marginBottom:20, shadowColor:'#22C55E', shadowOffset:{width:0,height:6}, shadowOpacity:0.35, shadowRadius:14, elevation:8},
  popTitle:      {fontSize:21, fontWeight:'900', color:DARK, textAlign:'center', marginBottom:12, letterSpacing:0.2},
  popMsg:        {fontSize:13, color:GREY, textAlign:'center', lineHeight:21, marginBottom:18},
  popRedirectRow:{flexDirection:'row', alignItems:'center'},
  popRedirectT:  {fontSize:11, color:'#9CA3AF'},
});
