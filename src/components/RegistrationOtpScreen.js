/**
 * RegistrationOtpScreen.js – Sri Chakra Industries
 * OTP verification screen shown immediately after dealer self-registration.
 * Verifies mobile ownership, marks isVerified=true, then redirects to Login.
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

const RED  = '#E05565';
const DARK = '#1A1A1A';
const GREY = '#6B7280';
const PINK = '#FFF5F6';

function SvgIcon({d, size = 18, color = GREY, sw = 1.8}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={d} stroke={color} strokeWidth={sw}
        strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

const IC = {
  back:   'M19 12H5M12 5l-7 7 7 7',
  lock:   'M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4',
  msg:    'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  arrow:  'M5 12h14M13 6l6 6-6 6',
  check:  'M9 12l2 2 4-4',
};

/* ─── Hero Banner ──────────────────────────────────────────── */
const HEADER_H = 160;
function HeroBanner({onBack}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {toValue:1, duration:600, easing:Easing.out(Easing.quad), useNativeDriver:true}).start();
  }, [anim]);

  const wavePath  = `M 0,${HEADER_H-30} C ${W*0.28},${HEADER_H+24} ${W*0.72},${HEADER_H-50} ${W},${HEADER_H-18} L ${W},${HEADER_H} L 0,${HEADER_H} Z`;
  const innerWave = `M 0,${HEADER_H-42} C ${W*0.30},${HEADER_H+10} ${W*0.68},${HEADER_H-60} ${W},${HEADER_H-30} L ${W},${HEADER_H-18} C ${W*0.72},${HEADER_H-50} ${W*0.28},${HEADER_H+24} 0,${HEADER_H-30} Z`;

  return (
    <View style={s.header}>
      <View style={StyleSheet.absoluteFill}>
        <Svg width={W} height={HEADER_H} viewBox={`0 0 ${W} ${HEADER_H}`} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="hbg" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%"   stopColor="#C94455" />
              <Stop offset="50%"  stopColor="#D44D5E" />
              <Stop offset="100%" stopColor="#E05565" />
            </LinearGradient>
            <LinearGradient id="shine" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.15" />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.00" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={W} height={HEADER_H} fill="url(#hbg)" />
          <Rect x="0" y="0" width={W} height={HEADER_H} fill="url(#shine)" />
          <Path d={innerWave} fill="rgba(255,255,255,0.08)" />
          <Path d={wavePath}  fill="#F4F4F4" />
        </Svg>
      </View>
      <Animated.View style={[s.headerContent, {opacity:anim}]}>
        <Pressable onPress={onBack} style={s.backBtn} hitSlop={12}>
          <SvgIcon d={IC.back} size={20} color="#FFF" sw={2.2} />
        </Pressable>
        <View style={s.heroCenter}>
          <View style={s.heroLogoCard}>
            <Image source={require('./assets/sri-chakra-logo.png')}
              style={s.heroLogo} resizeMode="contain" />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

/* ─── OTP Box Width ─────────────────────────────────────────── */
const OTP_BOX_W = Math.floor((W - 28 - 28 - 5 * 10) / 6);

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function RegistrationOtpScreen({
  mobile,
  backendOTP,
  onNewOTP,
  onBack,
  onVerified,
  onGoToLogin,
}) {
  const [otp,     setOtp]     = useState(['', '', '', '', '', '']);
  const [timer,   setTimer]   = useState(30);
  const [loading, setLoading] = useState(false);
  const refs      = useRef([]);
  const isMounted = useRef(true);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(28)).current;

  useEffect(() => { isMounted.current = true; return () => { isMounted.current = false; }; }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  {toValue:1, duration:550, easing:Easing.out(Easing.quad), useNativeDriver:true}),
      Animated.timing(slideAnim, {toValue:0, duration:480, easing:Easing.out(Easing.back(1.1)), useNativeDriver:true}),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // Pulse when OTP arrives
  useEffect(() => {
    if (!backendOTP || backendOTP.length !== 6) return;
    Animated.sequence([
      Animated.timing(pulseAnim, {toValue:1.03, duration:180, useNativeDriver:true}),
      Animated.timing(pulseAnim, {toValue:1,    duration:180, useNativeDriver:true}),
    ]).start();
  }, [backendOTP, pulseAnim]);

  // Timer countdown
  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

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
      const res = await authService.verifyRegistrationOTP(mobile, otp.join(''));
      if (res.success) {
        Alert.alert(
          '✅ Mobile Verified!',
          'Your registration is complete!\n\nAdmin will review and approve your account. You can then login with your mobile number.',
          [{
            text: 'Go to Login',
            onPress: () => {
              if (onVerified) onVerified(res.dealer);
              if (onGoToLogin) onGoToLogin();
            },
          }],
          {cancelable: false},
        );
      } else {
        Alert.alert('Invalid OTP', res.message || 'Please check and try again.');
        setOtp(['', '', '', '', '', '']);
        refs.current[0]?.focus();
      }
    } catch (err) {
      Alert.alert('Verification Failed', err.message || 'Invalid OTP. Please try again.');
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
      const res = await authService.sendOTPForRegistration(mobile);
      if (!isMounted.current) return;
      if (res.success) {
        setTimer(30);
        if (onNewOTP) onNewOTP(res.otp);
        Alert.alert('OTP Sent ✅', 'A new OTP has been sent to your mobile.');
      } else {
        Alert.alert('Error', res.message || 'Failed to resend OTP.');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to resend OTP.');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const progress = timer / 30;

  return (
    <SafeAreaView style={s.screen} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#C94455" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex:1}}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
          contentContainerStyle={{flexGrow:1}}>

          <HeroBanner onBack={onBack} />

          <Animated.View style={{opacity:fadeAnim, transform:[{translateY:slideAnim}]}}>

            {/* ── Header text ── */}
            <View style={s.otpSentRow}>
              <Text style={s.otpSentTitle}>Verify Your Mobile 🔐</Text>
              <Text style={s.otpSentSub}>
                Registration OTP sent to{' '}
                <Text style={s.otpSentMobile}>+91 {mobile}</Text>
              </Text>
              <Text style={s.otpSentNote}>
                Verify your mobile to complete registration
              </Text>
            </View>

            {/* ── OTP display card ── */}
            <Animated.View style={[s.otpDisplayCard, {transform:[{scale:pulseAnim}]}]}>
              <View style={s.otpDisplayHeader}>
                <View style={s.otpDisplayBadge}>
                  <SvgIcon d={IC.msg} size={14} color="#FFF" sw={2} />
                </View>
                <Text style={s.otpDisplayLabel}>Your OTP Code</Text>
              </View>
              <View style={s.otpDisplayRow}>
                {Array.from({length:6}).map((_, i) => {
                  const digit = backendOTP && backendOTP.length === 6 ? backendOTP[i] : null;
                  return (
                    <View key={i} style={[s.otpDisplayBox, !digit && s.otpDisplayBoxEmpty]}>
                      <Text style={[s.otpDisplayDigit, !digit && s.otpDisplayDigitDim]}>
                        {digit || '–'}
                      </Text>
                    </View>
                  );
                })}
              </View>
              <Text style={s.otpDisplayHint}>Enter these digits below to verify your mobile</Text>
            </Animated.View>

            {/* ── Enter OTP Card ── */}
            <View style={s.card}>
              <View style={s.cardHeaderRow}>
                <View style={s.cardIconBg}>
                  <SvgIcon d={IC.lock} size={20} color={RED} sw={2} />
                </View>
                <View style={{marginLeft:12}}>
                  <Text style={s.cardTitle}>Enter OTP</Text>
                  <Text style={s.cardSub}>Type the 6-digit code shown above</Text>
                </View>
              </View>
              <View style={s.divider} />

              {/* 6-digit OTP input */}
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

              {/* Timer + Resend */}
              <View style={s.timerRow}>
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

              {/* Verify Button */}
              <Pressable onPress={handleVerify} disabled={!filled || loading}
                style={({pressed}) => [s.redBtn, (!filled || loading) && s.redBtnOff, pressed && {opacity:0.88}]}>
                {loading
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <View style={s.redBtnInner}>
                      <Text style={s.redBtnText}>Verify &amp; Complete Registration</Text>
                      <View style={s.btnArrow}>
                        <SvgIcon d={IC.arrow} size={16} color="#FFF" sw={2.5} />
                      </View>
                    </View>
                }
              </Pressable>

              <View style={s.secureRow}>
                <SvgIcon d={IC.shield} size={13} color="#22C55E" sw={1.5} />
                <Text style={s.secureText}>  256-bit encrypted · Data protected by Sri Chakra Industries</Text>
              </View>
            </View>

            {/* ── Info strip ── */}
            <View style={s.infoStrip}>
              <SvgIcon d={IC.msg} size={14} color={RED} sw={1.6} />
              <Text style={s.infoStripText}>
                Didn't receive the OTP? Check your SMS inbox or tap Resend after{' '}
                <Text style={{fontWeight:'800', color:RED}}>30 seconds</Text>
              </Text>
            </View>

            {/* Back link */}
            <View style={s.regRow}>
              <Text style={s.regRowText}>Wrong number?  </Text>
              <Pressable onPress={onBack} hitSlop={10}>
                <Text style={s.regRowLink}>← Edit Registration</Text>
              </Pressable>
            </View>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
