/**
 * AuthScreens.js – Sri Chakra Industries
 * Login + OTP Verification — Premium UI
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
import Svg, {Circle, Defs, LinearGradient, Path, Rect, Stop} from 'react-native-svg';
import authService from './services/authService';

const {width: W} = Dimensions.get('window');

/* ─── Brand colours ──────────────────────────────────────── */
const RED    = '#E05565';
const DARK   = '#1A1A1A';
const GREY   = '#6B7280';
const PINK   = '#FFF5F6';

/* ─── SVG icon helper ────────────────────────────────────── */
function SvgIcon({d, size = 18, color = GREY, sw = 1.8}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={d} stroke={color} strokeWidth={sw}
        strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

const IC = {
  phone:  'M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24c1.12.28 2.28.43 3.48.43a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.01l-2.2 2.21z',
  email:  'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6',
  check:  'M9 12l2 2 4-4',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  arrow:  'M5 12h14M13 6l6 6-6 6',
  back:   'M19 12H5M12 5l-7 7 7 7',
  msg:    'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  lock:   'M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4',
};

const AUTH = {LOGIN: 'login', OTP: 'otp'};

/* ═══════════════════════════════════════════════════════════
   RED HERO BANNER
═══════════════════════════════════════════════════════════ */
const HEADER_H = 160;

function HeroBanner({children, height = HEADER_H}) {
  const contentO  = useRef(new Animated.Value(0)).current;
  const contentY  = useRef(new Animated.Value(-20)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentO, {toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true}),
      Animated.timing(contentY, {toValue: 0, duration: 650, delay: 80, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true}),
      Animated.spring(logoScale, {toValue: 1, delay: 100, friction: 7, tension: 55, useNativeDriver: true}),
    ]).start();
  }, [contentO, contentY, logoScale]);

  const wavePath = `M 0,${height - 30} C ${W * 0.28},${height + 24} ${W * 0.72},${height - 50} ${W},${height - 18} L ${W},${height} L 0,${height} Z`;
  const innerWave = `M 0,${height - 42} C ${W * 0.30},${height + 10} ${W * 0.68},${height - 60} ${W},${height - 30} L ${W},${height - 18} C ${W * 0.72},${height - 50} ${W * 0.28},${height + 24} 0,${height - 30} Z`;

  return (
    <View style={s.header}>
      <View style={StyleSheet.absoluteFill}>
        <Svg width={W} height={height} viewBox={`0 0 ${W} ${height}`} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%"   stopColor="#C94455" />
              <Stop offset="50%"  stopColor="#D44D5E" />
              <Stop offset="100%" stopColor="#E05565" />
            </LinearGradient>
            <LinearGradient id="shine" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.15" />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.00" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={W} height={height} fill="url(#bg)" />
          <Rect x="0" y="0" width={W} height={height} fill="url(#shine)" />
          <Path d={innerWave} fill="rgba(255,255,255,0.08)" />
          <Path d={wavePath} fill="#F4F4F4" />
        </Svg>
      </View>
      <Animated.View style={[s.headerContent, {opacity: contentO, transform: [{translateY: contentY}, {scale: logoScale}]}]}>
        {children}
      </Animated.View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════
   CONTROLLER
═══════════════════════════════════════════════════════════ */
function AuthScreens({onAuthenticated, onGoToRegister, registeredName}) {
  const [screen,     setScreen]  = useState(AUTH.LOGIN);
  const [mobile,     setMobile]  = useState('');
  const [sessionOTP, setSessionOTP] = useState('');

  if (screen === AUTH.OTP) {
    return (
      <OtpScreen
        mobile={mobile}
        backendOTP={sessionOTP}
        onNewOTP={otp => setSessionOTP(String(otp ?? '').trim())}
        onBack={() => setScreen(AUTH.LOGIN)}
        onVerify={onAuthenticated}
      />
    );
  }
  return (
    <LoginScreen
      mobile={mobile}
      setMobile={setMobile}
      registeredName={registeredName}
      onGoToRegister={onGoToRegister}
      onOtpSent={(otp) => {
        setSessionOTP(String(otp ?? '').trim());
        setScreen(AUTH.OTP);
      }}
    />
  );
}

/* ═══════════════════════════════════════════════════════════
   LOGIN SCREEN
═══════════════════════════════════════════════════════════ */
function LoginScreen({mobile, setMobile, onOtpSent, onGoToRegister, registeredName}) {
  const [loading, setLoading] = useState(false);
  const canSubmit = mobile.length === 10;

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  {toValue: 1, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: true}),
      Animated.timing(slideAnim, {toValue: 0, duration: 520, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true}),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const res = await authService.sendOTP(mobile);
      if (res.success) {
        onOtpSent(res.otp, mobile);
      } else {
        Alert.alert('Error', res.message || 'Failed to send OTP');
      }
    } catch (err) {
      Alert.alert('Connection Error', err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.screen} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#C94455" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1}}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
          contentContainerStyle={{flexGrow: 1}}>

          {/* ── Hero Banner ── */}
          <HeroBanner>
            <View style={s.heroColumn}>
              <View style={s.heroArrowRow} />
              <View style={s.heroTopRow}>
                <View style={s.heroLeftBlock}>
                  <Text style={s.heroGreeting}>Welcome Dealer 👋</Text>
                  {!!registeredName
                    ? <Text style={s.heroDealerNameBig} numberOfLines={2}>{registeredName}</Text>
                    : <Text style={s.heroDealerNameBig}>Dealer Portal</Text>
                  }
                  <Text style={s.heroSubLabel}>Sri Chakra Industries</Text>
                </View>
                <View style={s.heroLogoCard}>
                  <Image source={require('./assets/sri-chakra-logo.png')}
                    style={s.heroLogo} resizeMode="contain" />
                </View>
              </View>
            </View>
          </HeroBanner>

          <Animated.View style={{opacity: fadeAnim, transform: [{translateY: slideAnim}]}}>

            {/* ── Welcome strip ── */}
            <View style={s.welcomeStrip}>
              <Text style={s.welcomeEmoji}>🤝</Text>
              <View style={{marginLeft: 10}}>
                <Text style={s.welcomeTitle}>Welcome Back!</Text>
                <Text style={s.welcomeSub}>Login to your Sri Chakra dealer account</Text>
              </View>
            </View>

            {/* ── Login Card ── */}
            <View style={s.card}>
              <View style={s.cardHeaderRow}>
                <View style={s.cardIconBg}>
                  <SvgIcon d={IC.phone} size={20} color={RED} sw={2} />
                </View>
                <View style={{marginLeft: 12}}>
                  <Text style={s.cardTitle}>Dealer Login</Text>
                  <Text style={s.cardSub}>Enter your registered mobile number</Text>
                </View>
              </View>

              <View style={s.divider} />

              {/* Mobile input */}
              <Text style={s.fieldLabel}>Mobile Number <Text style={s.req}>*</Text></Text>
              <View style={[s.inputRow, canSubmit && s.inputRowActive]}>
                <View style={s.inputIconWrap}>
                  <SvgIcon d={IC.phone} size={17} color={canSubmit ? RED : '#AAAAAA'} sw={1.8} />
                </View>
                <View style={s.dialCode}>
                  <Text style={s.dialCodeText}>+91</Text>
                </View>
                <View style={s.divLine} />
                <TextInput
                  keyboardType="number-pad"
                  maxLength={10}
                  value={mobile}
                  onChangeText={v => setMobile(v.replace(/\D/g, ''))}
                  placeholder="10-digit mobile number"
                  placeholderTextColor="#CCCCCC"
                  style={s.textInput}
                />
              </View>
              <Text style={s.inputHint}>OTP will be sent to this number</Text>

              {/* Send OTP Button */}
              <Pressable onPress={handleSubmit} disabled={!canSubmit || loading}
                style={({pressed}) => [s.redBtn, (!canSubmit || loading) && s.redBtnOff, pressed && {opacity: 0.88}]}>
                {loading
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <View style={s.redBtnInner}>
                      <Text style={s.redBtnText}>Send OTP</Text>
                      <View style={s.btnArrow}>
                        <SvgIcon d={IC.arrow} size={16} color="#FFF" sw={2.5} />
                      </View>
                    </View>
                }
              </Pressable>

              {/* Secure note */}
              <View style={s.secureRow}>
                <SvgIcon d={IC.shield} size={13} color="#22C55E" sw={1.5} />
                <Text style={s.secureText}>  256-bit encrypted · Data never shared</Text>
              </View>
            </View>

            {/* ── Feature chips ── */}
            <View style={s.chips}>
              {[
                {icon: IC.shield, label: 'Secure Login'},
                {icon: IC.lock,   label: 'OTP Verified'},
                {icon: IC.msg,    label: 'Instant SMS'},
              ].map((c, i) => (
                <View key={i} style={s.chip}>
                  <SvgIcon d={c.icon} size={15} color={RED} sw={1.7} />
                  <Text style={s.chipText}>{c.label}</Text>
                </View>
              ))}
            </View>

            {/* ── Register link ── */}
            {onGoToRegister && (
              <View style={s.regRow}>
                <Text style={s.regRowText}>New dealer?  </Text>
                <Pressable onPress={onGoToRegister} hitSlop={10}>
                  <Text style={s.regRowLink}>Register here →</Text>
                </Pressable>
              </View>
            )}

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ═══════════════════════════════════════════════════════════
   OTP VERIFICATION SCREEN
═══════════════════════════════════════════════════════════ */
const OTP_BOX_W = Math.floor((W - 28 - 28 - 5 * 10) / 6);

function OtpScreen({mobile, backendOTP = '', onNewOTP, onVerify, onBack}) {
  const [otp, setOtp]       = useState(['', '', '', '', '', '']);
  const [timer, setTimer]   = useState(30);
  const [loading, setLoading] = useState(false);
  const refs      = useRef([]);
  const isMounted = useRef(true);

  // pulse animation for the OTP digits card
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // whenever backendOTP arrives/changes, pulse the card
  useEffect(() => {
    if (backendOTP.length !== 6) return;
    Animated.sequence([
      Animated.timing(pulseAnim, {toValue: 1.03, duration: 180, useNativeDriver: true}),
      Animated.timing(pulseAnim, {toValue: 1,    duration: 180, useNativeDriver: true}),
    ]).start();
  }, [backendOTP, pulseAnim]);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  {toValue: 1, duration: 550, easing: Easing.out(Easing.quad), useNativeDriver: true}),
      Animated.timing(slideAnim, {toValue: 0, duration: 480, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true}),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const updateOtp = (value, index) => {
    const digit = value.replace(/\D/g, '').slice(0, 1);
    const next  = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) refs.current[index + 1]?.focus();
  };

  const handleKey = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0)
      refs.current[index - 1]?.focus();
  };

  const filled = otp.every(d => d !== '');

  const handleVerify = async () => {
    if (!filled) return;
    setLoading(true);
    try {
      const res = await authService.verifyOTP(mobile, otp.join(''));
      if (res.success) {
        Alert.alert('Login Successful! ✅', `Welcome ${res.dealer?.name || 'Dealer'}!`, [
          {text: 'Continue', onPress: () => onVerify(res.dealer)},
        ]);
      } else {
        Alert.alert('Invalid OTP', res.message || 'Please check and try again.');
        setOtp(['', '', '', '', '', '']);
        refs.current[0]?.focus();
      }
    } catch (err) {
      Alert.alert('Verification Failed', err.message || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      refs.current[0]?.focus();
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    setLoading(true);
    setOtp(['', '', '', '', '', '']);
    try {
      const res = await authService.sendOTP(mobile);
      if (!isMounted.current) return;
      if (res.success) {
        setTimer(30);
        if (onNewOTP) onNewOTP(res.otp);
        Alert.alert('OTP Sent ✅', 'A new OTP has been sent to your mobile.');
      } else {
        Alert.alert('Error', res.message || 'Failed to resend OTP');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to resend OTP');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  /* timer progress 0→1 */
  const progress = timer / 30;

  return (
    <SafeAreaView style={s.screen} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#C94455" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1}}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
          contentContainerStyle={{flexGrow: 1}}>

          {/* ── Hero — logo only ── */}
          <HeroBanner>
            {/* Back button — absolute top-left */}
            <Pressable onPress={onBack} style={s.backBtn} hitSlop={12}>
              <SvgIcon d={IC.back} size={20} color="#FFF" sw={2.2} />
            </Pressable>
            {/* Logo centered in white rounded card */}
            <View style={s.otpHeroCenter}>
              <View style={s.heroLogoCard}>
                <Image source={require('./assets/sri-chakra-logo.png')}
                  style={s.heroLogo} resizeMode="contain" />
              </View>
            </View>
          </HeroBanner>

          <Animated.View style={{opacity: fadeAnim, transform: [{translateY: slideAnim}]}}>

            {/* ── OTP sent info ── */}
            <View style={s.otpSentRow}>
              <Text style={s.otpSentTitle}>Verify OTP 🔐</Text>
              <Text style={s.otpSentSub}>
                Code sent to <Text style={s.otpSentMobile}>+91 {mobile}</Text>
              </Text>
            </View>

            {/* ══════════════════════════════════════════
                BACKEND OTP DISPLAY CARD (above Enter OTP)
            ══════════════════════════════════════════ */}
            <Animated.View style={[s.otpDisplayCard, {transform: [{scale: pulseAnim}]}]}>
              <View style={s.otpDisplayHeader}>
                <View style={s.otpDisplayBadge}>
                  <SvgIcon d={IC.msg} size={14} color="#FFF" sw={2} />
                </View>
                <Text style={s.otpDisplayLabel}>Your OTP Code</Text>
              </View>

              {/* 6 digit boxes */}
              <View style={s.otpDisplayRow}>
                {Array.from({length: 6}).map((_, i) => {
                  const digit = backendOTP.length === 6 ? backendOTP[i] : null;
                  return (
                    <View key={i} style={[s.otpDisplayBox, !digit && s.otpDisplayBoxEmpty]}>
                      <Text style={[s.otpDisplayDigit, !digit && s.otpDisplayDigitDim]}>
                        {digit || '–'}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <Text style={s.otpDisplayHint}>
                Enter these digits in the box below to verify
              </Text>
            </Animated.View>

            {/* ── Enter OTP card — unchanged ── */}
            <View style={s.card}>

              {/* Header */}
              <View style={s.cardHeaderRow}>
                <View style={s.cardIconBg}>
                  <SvgIcon d={IC.lock} size={20} color={RED} sw={2} />
                </View>
                <View style={{marginLeft: 12}}>
                  <Text style={s.cardTitle}>Enter OTP</Text>
                  <Text style={s.cardSub}>Type the 6-digit code shown above</Text>
                </View>
              </View>

              <View style={s.divider} />

              {/* OTP boxes */}
              <View style={s.otpRow}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={r => { refs.current[index] = r; }}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={digit}
                    onChangeText={v => updateOtp(v, index)}
                    onKeyPress={e => handleKey(e, index)}
                    style={[s.otpBox, digit ? s.otpBoxFilled : null]}
                  />
                ))}
              </View>

              {/* Timer + Resend row */}
              <View style={s.timerRow}>
                {/* circular countdown */}
                <View style={s.timerCircleWrap}>
                  <Svg width={40} height={40} viewBox="0 0 40 40">
                    <Circle cx="20" cy="20" r="16" fill="none" stroke="#F0E0E0" strokeWidth={3} />
                    <Circle cx="20" cy="20" r="16" fill="none"
                      stroke={timer > 0 ? RED : '#E0E0E0'} strokeWidth={3}
                      strokeDasharray={`${progress * 100.5} 100.5`}
                      strokeLinecap="round" transform="rotate(-90 20 20)" />
                  </Svg>
                  <Text style={s.timerNum}>{timer}</Text>
                </View>
                <Pressable onPress={handleResend} disabled={timer > 0 || loading} hitSlop={10}>
                  {timer > 0
                    ? <Text style={s.resendOff}>Resend in <Text style={s.resendCountdown}>{timer}s</Text></Text>
                    : <Text style={s.resendActive}>Resend OTP →</Text>
                  }
                </Pressable>
              </View>

              {/* Verify button */}
              <Pressable onPress={handleVerify} disabled={!filled || loading}
                style={({pressed}) => [s.redBtn, (!filled || loading) && s.redBtnOff, pressed && {opacity: 0.88}]}>
                {loading
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <View style={s.redBtnInner}>
                      <Text style={s.redBtnText}>Verify &amp; Continue</Text>
                      <View style={s.btnArrow}>
                        <SvgIcon d={IC.arrow} size={16} color="#FFF" sw={2.5} />
                      </View>
                    </View>
                }
              </Pressable>

              {/* Secure note */}
              <View style={s.secureRow}>
                <SvgIcon d={IC.shield} size={13} color="#22C55E" sw={1.5} />
                <Text style={s.secureText}>  256-bit encrypted · Reviewed by Sri Chakra admin only</Text>
              </View>

            </View>

            {/* ── Info strip ── */}
            <View style={s.infoStrip}>
              <SvgIcon d={IC.msg} size={14} color={RED} sw={1.6} />
              <Text style={s.infoStripText}>
                Didn't receive the OTP? Check your SMS inbox or tap Resend after {' '}
                <Text style={{fontWeight: '800', color: RED}}>30 seconds</Text>
              </Text>
            </View>

            {/* Login link */}
            <View style={s.regRow}>
              <Text style={s.regRowText}>Wrong number?  </Text>
              <Pressable onPress={onBack} hitSlop={10}>
                <Text style={s.regRowLink}>← Change number</Text>
              </Pressable>
            </View>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */
const s = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#F4F4F4'},

  /* ── Hero ── */
  header: {width: '100%', height: HEADER_H, backgroundColor: '#C94455', overflow: 'hidden'},
  headerContent: {flex: 1, alignItems: 'center', justifyContent: 'center'},

  /* Logo in white rounded card */
  heroLogoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.13,
    shadowRadius: 8,
    elevation: 4,
  },
  heroLogo: {width: W * 0.38, height: 42},

  /* OTP screen — logo centered in full header area */
  otpHeroCenter: {
    flex: 1,
    width: W,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 24,
  },

  /* Hero top row — left text · right logo card (inside heroColumn) */
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  heroLeftBlock: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  heroGreeting: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
    marginBottom: 3,
    letterSpacing: 0.3,
  },
  heroDealerNameBig: {
    fontSize: 19,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.2,
    marginBottom: 4,
    lineHeight: 24,
  },
  heroSubLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.60)',
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  /* Back button (OTP screen) */
  backBtn: {
    position: 'absolute', top: 14, left: 16, zIndex: 20,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },

  /* Login hero — column layout: arrow row on top, content row below */
  heroColumn: {
    flex: 1,
    flexDirection: 'column',
    width: W,
    alignSelf: 'stretch',
    paddingHorizontal: 16,
    paddingBottom: 18,
    paddingTop: 8,
    justifyContent: 'space-between',
  },
  heroArrowRow: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroRegisterBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },

  /* legacy — kept for safety, no longer used in JSX */
  heroBackBtn:         {width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center'},
  heroBackPlaceholder: {width: 36, height: 36},
  heroCenterBlock:     {flex: 1, alignItems: 'center', justifyContent: 'center'},
  heroDealerRow:       {flexDirection: 'row', alignItems: 'center', marginTop: 3},
  heroDealerWelcome:   {fontSize: 12, color: 'rgba(255,255,255,0.70)', fontWeight: '500'},
  heroDealerName:      {fontSize: 13, color: '#FFFFFF', fontWeight: '800', letterSpacing: 0.2},
  heroTitle:           {fontSize: 19, fontWeight: '800', color: '#FFFFFF'},
  heroDivider:         {width: 28, height: 2, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.40)', marginTop: 8, marginBottom: 5},
  heroSub:             {fontSize: 11, color: 'rgba(255,255,255,0.65)', letterSpacing: 0.8, textTransform: 'uppercase'},

  /* ── Welcome strip (Login only) ── */
  welcomeStrip: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 20, marginBottom: 2,
  },
  welcomeEmoji: {fontSize: 30},
  welcomeTitle: {fontSize: 20, fontWeight: '800', color: DARK, marginBottom: 2},
  welcomeSub:   {fontSize: 12, color: GREY},

  /* ── Card ── */
  card: {
    marginHorizontal: 14, marginTop: 14, marginBottom: 8,
    backgroundColor: '#FFFFFF', borderRadius: 20,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 18,
    shadowColor: RED, shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 5,
    borderWidth: 1, borderColor: 'rgba(197,31,43,0.07)',
  },
  cardHeaderRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 12},
  cardIconBg: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: PINK, alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: {fontSize: 16, fontWeight: '800', color: DARK, marginBottom: 2},
  cardSub:   {fontSize: 11, color: GREY},

  divider: {height: 1, backgroundColor: '#F0E0E0', marginBottom: 16},

  /* ── Field ── */
  fieldLabel: {fontSize: 12, fontWeight: '700', color: '#374151', letterSpacing: 0.3, marginBottom: 7},
  req:        {color: RED, fontWeight: '800'},
  inputRow: {
    height: 54, borderRadius: 14, borderWidth: 1.5,
    borderColor: '#E5E7EB', backgroundColor: '#FAFAFA',
    flexDirection: 'row', alignItems: 'center', marginBottom: 4,
  },
  inputRowActive: {borderColor: RED, backgroundColor: '#FFF8F8'},
  inputIconWrap:  {paddingLeft: 14, paddingRight: 8},
  dialCode:       {paddingRight: 8},
  dialCodeText:   {fontSize: 15, fontWeight: '700', color: DARK},
  divLine:        {width: 1.5, height: 26, backgroundColor: '#E0E0E0', marginRight: 10},
  textInput:      {flex: 1, fontSize: 16, fontWeight: '600', color: DARK, paddingRight: 10},
  inputCheck:     {paddingRight: 12},
  inputHint:      {fontSize: 10, color: GREY, marginBottom: 12, marginLeft: 2},

  /* ── Red button ── */
  redBtn: {
    height: 54, borderRadius: 14, backgroundColor: RED,
    alignItems: 'center', justifyContent: 'center', marginTop: 10,
    shadowColor: RED, shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.30, shadowRadius: 12, elevation: 5,
  },
  redBtnOff:   {opacity: 0.45},
  redBtnInner: {flexDirection: 'row', alignItems: 'center'},
  redBtnText:  {color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.4, marginRight: 10},
  btnArrow: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },

  /* ── Secure note ── */
  secureRow:  {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 14},
  secureText: {fontSize: 11, color: GREY},

  /* ── Feature chips (Login) ── */
  chips: {flexDirection: 'row', justifyContent: 'center', marginHorizontal: 14, marginTop: 14, gap: 8},
  chip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, backgroundColor: PINK, borderRadius: 10,
    paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(197,31,43,0.12)',
  },
  chipText: {fontSize: 10, fontWeight: '700', color: '#444'},

  /* ── Register link ── */
  regRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 20, paddingBottom: 32,
  },
  regRowText: {fontSize: 14, color: GREY},
  regRowLink: {fontSize: 14, fontWeight: '800', color: RED},

  /* ── OTP sent info (plain text, OTP screen) ── */
  otpSentRow: {marginHorizontal: 16, marginTop: 18, marginBottom: 4},
  otpSentTitle: {fontSize: 22, fontWeight: '800', color: DARK, marginBottom: 4},
  otpSentSub:   {fontSize: 13, color: GREY},
  otpSentMobile:{fontWeight: '800', color: RED},

  /* ── Backend OTP display card (OTP screen) ── */
  otpDisplayCard: {
    marginHorizontal: 14, marginTop: 12, marginBottom: 8,
    backgroundColor: '#FFFFFF', borderRadius: 18,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 2, borderColor: RED,
    shadowColor: RED, shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.16, shadowRadius: 12, elevation: 6,
  },
  otpDisplayHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8},
  otpDisplayBadge: {
    width: 28, height: 28, borderRadius: 7,
    backgroundColor: RED, alignItems: 'center', justifyContent: 'center',
  },
  otpDisplayLabel: {flex: 1, fontSize: 14, fontWeight: '800', color: DARK},
  otpDisplayRow:   {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10},
  otpDisplayBox: {
    width: OTP_BOX_W, height: 44, borderRadius: 10,
    backgroundColor: RED, alignItems: 'center', justifyContent: 'center',
    shadowColor: RED, shadowOpacity: 0.22, shadowRadius: 4,
    shadowOffset: {width: 0, height: 2}, elevation: 3,
  },
  otpDisplayBoxEmpty: {
    backgroundColor: PINK, borderWidth: 1.5,
    borderColor: RED, borderStyle: 'dashed',
    shadowOpacity: 0, elevation: 0,
  },
  otpDisplayDigit:    {fontSize: 20, fontWeight: '900', color: '#FFF'},
  otpDisplayDigitDim: {fontSize: 17, color: 'rgba(197,31,43,0.4)'},
  otpDisplayHint:     {fontSize: 11, color: GREY, textAlign: 'center'},

  /* ── OTP input boxes ── */
  otpRow: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14},
  otpBox: {
    width: OTP_BOX_W, height: 46, borderRadius: 11, borderWidth: 2,
    borderColor: '#E0E0E0', backgroundColor: '#FAFAFA',
    textAlign: 'center', fontSize: 20, fontWeight: '800',
    color: DARK, padding: 0, includeFontPadding: false,
  },
  otpBoxFilled: {borderColor: RED, backgroundColor: '#FFF5F5', color: RED},

  /* ── Timer + Resend ── */
  timerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 10, marginBottom: 16,
  },
  timerCircleWrap: {width: 40, height: 40, alignItems: 'center', justifyContent: 'center'},
  timerNum:    {position: 'absolute', fontSize: 11, fontWeight: '800', color: RED},
  resendOff:   {fontSize: 13, fontWeight: '600', color: '#9CA3AF'},
  resendActive: {fontSize: 14, fontWeight: '800', color: RED},
  resendCountdown: {color: RED, fontWeight: '900'},

  /* ── Info strip (OTP) ── */
  infoStrip: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    marginHorizontal: 14, marginTop: 10, marginBottom: 6,
    backgroundColor: PINK, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: 'rgba(197,31,43,0.15)',
  },
  infoStripText: {flex: 1, fontSize: 12, color: '#555', lineHeight: 18},
});

export default AuthScreens;
