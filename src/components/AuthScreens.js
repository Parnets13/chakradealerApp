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
import Svg, {Circle, Defs, LinearGradient, Path, Stop} from 'react-native-svg';
import {colors, shadow} from './theme';
import authService from './services/authService';

const {width: W, height: H} = Dimensions.get('window');
const RED = colors.red;

const AUTH_SCREEN = {LOGIN: 'login', OTP: 'otp'};

/* ─── Animated floating bubbles in banner ─── */
const BUBBLES = [
  // x%, y(px), size, type: 'solid'|'ring'|'small'
  {x: 0.08, y: 18,  size: 14, type: 'ring',  delay: 0},
  {x: 0.88, y: 14,  size: 10, type: 'solid', delay: 300},
  {x: 0.04, y: 65,  size: 7,  type: 'small', delay: 600},
  {x: 0.94, y: 72,  size: 12, type: 'ring',  delay: 150},
  {x: 0.20, y: 10,  size: 6,  type: 'small', delay: 450},
  {x: 0.75, y: 8,   size: 9,  type: 'solid', delay: 200},
  {x: 0.50, y: 6,   size: 5,  type: 'small', delay: 700},
  {x: 0.35, y: 80,  size: 11, type: 'ring',  delay: 350},
  {x: 0.65, y: 55,  size: 7,  type: 'solid', delay: 500},
  {x: 0.15, y: 88,  size: 8,  type: 'ring',  delay: 100},
  {x: 0.82, y: 90,  size: 6,  type: 'small', delay: 650},
  {x: 0.55, y: 95,  size: 9,  type: 'solid', delay: 250},
];

function FloatingBubble({bubble}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 2200 + bubble.delay * 2,
          delay: bubble.delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 2200 + bubble.delay * 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [anim, bubble.delay]);

  const ty = anim.interpolate({inputRange: [0, 1], outputRange: [0, -9]});
  const tx = anim.interpolate({inputRange: [0, 1], outputRange: [0, bubble.delay % 2 === 0 ? 4 : -4]});
  const scale = anim.interpolate({inputRange: [0, 0.5, 1], outputRange: [1, 1.15, 1]});

  const left = W * bubble.x - bubble.size / 2;
  const top  = bubble.y;

  if (bubble.type === 'ring') {
    return (
      <Animated.View
        style={{
          position: 'absolute', left, top,
          width: bubble.size, height: bubble.size, borderRadius: bubble.size / 2,
          borderWidth: 1.8, borderColor: RED,
          opacity: 0.30,
          transform: [{translateY: ty}, {translateX: tx}, {scale}],
        }}
      />
    );
  }
  if (bubble.type === 'small') {
    // Diamond shape using rotation
    return (
      <Animated.View
        style={{
          position: 'absolute', left, top,
          width: bubble.size, height: bubble.size,
          backgroundColor: RED,
          opacity: 0.20,
          transform: [{translateY: ty}, {translateX: tx}, {scale}, {rotate: '45deg'}],
        }}
      />
    );
  }
  // solid circle
  return (
    <Animated.View
      style={{
        position: 'absolute', left, top,
        width: bubble.size, height: bubble.size, borderRadius: bubble.size / 2,
        backgroundColor: RED,
        opacity: 0.16,
        transform: [{translateY: ty}, {translateX: tx}, {scale}],
      }}
    />
  );
}

function PinkDots() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {BUBBLES.map((b, i) => <FloatingBubble key={i} bubble={b} />)}
    </View>
  );
}

/* ─── Curved red wave at bottom of banner ─── */
function BannerWave({height = 36}) {
  return (
    <Svg
      width={W}
      height={height}
      viewBox={`0 0 ${W} ${height}`}
      style={{position: 'absolute', bottom: 0}}>
      <Defs>
        <LinearGradient id="waveGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%" stopColor="#FFF0F0" />
          <Stop offset="100%" stopColor="#FFFFFF" />
        </LinearGradient>
      </Defs>
      <Path
        d={`M0,${height} L0,${height * 0.5} Q${W * 0.25},0 ${W * 0.5},${height * 0.4}
           Q${W * 0.75},${height * 0.8} ${W},${height * 0.2} L${W},${height} Z`}
        fill="url(#waveGrad)"
      />
    </Svg>
  );
}

/* ─── Main controller ─── */
function AuthScreens({onAuthenticated}) {
  const [screen, setScreen] = useState(AUTH_SCREEN.LOGIN);
  const [mobile, setMobile] = useState('');
  const [currentOTP, setCurrentOTP] = useState('');

  if (screen === AUTH_SCREEN.OTP) {
    return (
      <OtpScreen
        mobile={mobile}
        receivedOTP={currentOTP}
        onBack={() => {setScreen(AUTH_SCREEN.LOGIN); setCurrentOTP('');}}
        onVerify={onAuthenticated}
      />
    );
  }
  return (
    <LoginScreen
      mobile={mobile}
      setMobile={setMobile}
      onOtp={otp => {setCurrentOTP(otp); setScreen(AUTH_SCREEN.OTP);}}
    />
  );
}

/* ═══════════════════════════════════════════════
   LOGIN SCREEN
═══════════════════════════════════════════════ */
function LoginScreen({mobile, setMobile, onOtp}) {
  const [loading, setLoading] = useState(false);
  const canSubmit = mobile.length === 10;

  // Animations
  const bannerY   = useRef(new Animated.Value(-30)).current;
  const bannerO   = useRef(new Animated.Value(0)).current;
  const headingO  = useRef(new Animated.Value(0)).current;
  const headingY  = useRef(new Animated.Value(20)).current;
  const cardO     = useRef(new Animated.Value(0)).current;
  const cardY     = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.sequence([
      // Banner slides down
      Animated.parallel([
        Animated.timing(bannerY, {toValue: 0, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true}),
        Animated.timing(bannerO, {toValue: 1, duration: 450, useNativeDriver: true}),
      ]),
      // Heading fades up
      Animated.parallel([
        Animated.timing(headingO, {toValue: 1, duration: 380, useNativeDriver: true}),
        Animated.timing(headingY, {toValue: 0, duration: 380, easing: Easing.out(Easing.quad), useNativeDriver: true}),
      ]),
      // Card fades up
      Animated.parallel([
        Animated.timing(cardO, {toValue: 1, duration: 400, useNativeDriver: true}),
        Animated.timing(cardY, {toValue: 0, duration: 400, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true}),
      ]),
    ]).start();
  }, [bannerY, bannerO, headingO, headingY, cardO, cardY]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const response = await authService.sendOTP(mobile);
      if (response.success) {
        onOtp(response.otp || '');
      } else {
        Alert.alert('Error', response.message || 'Failed to send OTP');
      }
    } catch (error) {
      Alert.alert('Connection Error', error.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.screen} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{flex: 1}}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{flexGrow: 1}}>

          {/* ── Banner ── */}
          <Animated.View style={[s.banner, {opacity: bannerO, transform: [{translateY: bannerY}]}]}>
            <PinkDots />
            <Image
              source={require('./assets/login.png')}
              style={s.bannerImg}
              resizeMode="cover"
            />
            <BannerWave height={40} />
          </Animated.View>

          {/* ── Welcome heading ── */}
          <Animated.View style={[s.headingWrap, {opacity: headingO, transform: [{translateY: headingY}]}]}>
            <Text style={s.heading}>Welcome Back! 👋</Text>
            <Text style={s.subheading}>Login to your Sri Chakra dealer account</Text>
          </Animated.View>

          {/* ── Login card ── */}
          <Animated.View style={[s.card, {opacity: cardO, transform: [{translateY: cardY}]}]}>
            {/* Mobile input */}
            <Text style={s.label}>Mobile Number</Text>
            <View style={[s.inputRow, mobile.length === 10 && s.inputRowActive]}>
              <View style={s.phoneIconWrap}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24 11.4 11.4 0 0 0 3.58.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.01l-2.2 2.21z"
                    stroke={RED} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
                  />
                </Svg>
              </View>
              <View style={s.dialCode}>
                <Text style={s.dialCodeText}>+91 ▾</Text>
              </View>
              <View style={s.dividerLine} />
              <TextInput
                keyboardType="number-pad"
                maxLength={10}
                value={mobile}
                onChangeText={v => setMobile(v.replace(/\D/g, ''))}
                placeholder="Enter mobile number"
                placeholderTextColor="#BDBDBD"
                style={s.textInput}
              />
            </View>

            {/* Send OTP button */}
            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit || loading}
              style={[s.redBtn, (!canSubmit || loading) && s.redBtnDisabled]}>
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={s.redBtnText}>Send OTP</Text>
              )}
            </Pressable>

            {/* Security note */}
            <View style={s.secureRow}>
              <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" style={{marginRight: 5}}>
                <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                  stroke="#9E9E9E" strokeWidth={1.5} fill="none" strokeLinecap="round" />
              </Svg>
              <Text style={s.secureText}>Your data is safe and secure with us.</Text>
            </View>
          </Animated.View>

          {/* ── Below card: feature strips + tagline ── */}
          <Animated.View style={[s.featureStrip, {opacity: cardO}]}>
            {/* 3 feature chips */}
            <View style={s.featureRow}>
              <View style={s.featureChip}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                    fill={RED} stroke={RED} strokeWidth={0.4}/>
                  <Path d="M9 12l2 2 4-4" stroke="#FFF" strokeWidth={2}
                    strokeLinecap="round" strokeLinejoin="round"/>
                </Svg>
                <Text style={s.featureLabel}>Secure Login</Text>
              </View>

              <View style={s.featureDivider}/>

              <View style={s.featureChip}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"
                    stroke={RED} strokeWidth={1.7} strokeLinejoin="round" fill="none"/>
                  <Circle cx="5.5" cy="18.5" r="1.5" fill={RED}/>
                  <Circle cx="18.5" cy="18.5" r="1.5" fill={RED}/>
                </Svg>
                <Text style={s.featureLabel}>Live Tracking</Text>
              </View>

              <View style={s.featureDivider}/>

              <View style={s.featureChip}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"
                    stroke={RED} strokeWidth={1.7} fill="none" strokeLinejoin="round"/>
                  <Path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"
                    stroke={RED} strokeWidth={1.7} fill="none" strokeLinecap="round"/>
                  <Circle cx="12" cy="12" r="1.5" fill={RED}/>
                </Svg>
                <Text style={s.featureLabel}>Dealer Only</Text>
              </View>
            </View>

            {/* Thin red divider */}
            <View style={s.featureBottomLine}/>

            {/* Tagline */}
          
          </Animated.View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ═══════════════════════════════════════════════
   OTP VERIFIED ICON  — pulse glow animation
═══════════════════════════════════════════════ */
function LockIllustration() {
  const pulse = useRef(new Animated.Value(1)).current;
  const glow  = useRef(new Animated.Value(0.07)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulse, {toValue: 1.08, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
          Animated.timing(glow,  {toValue: 0.18, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: false}),
        ]),
        Animated.parallel([
          Animated.timing(pulse, {toValue: 1,    duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
          Animated.timing(glow,  {toValue: 0.07, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: false}),
        ]),
      ])
    ).start();
  }, [pulse, glow]);

  return (
    <View style={s.lockWrap}>
      {/* Pulsing outer glow ring */}
      <Animated.View style={[s.lockOuterRing, {backgroundColor: glow.interpolate({
        inputRange: [0.07, 0.18],
        outputRange: ['rgba(197,31,43,0.07)', 'rgba(197,31,43,0.18)'],
      })}]} />
      {/* Inner circle scales with pulse */}
      <Animated.View style={[s.lockCircle, {transform: [{scale: pulse}]}]}>
        <Image
          source={require('./assets/Verified-icon.png')}
          style={s.verifiedIconImg}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

/* ═══════════════════════════════════════════════
   OTP SCREEN
═══════════════════════════════════════════════ */
function OtpScreen({mobile, receivedOTP = '', onVerify, onBack}) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(28);
  const [loading, setLoading] = useState(false);
  const refs = useRef([]);

  // Entrance animations
  const iconScale  = useRef(new Animated.Value(0.7)).current;
  const iconO      = useRef(new Animated.Value(0)).current;
  const cardO      = useRef(new Animated.Value(0)).current;
  const cardY      = useRef(new Animated.Value(28)).current;
  const headingO   = useRef(new Animated.Value(0)).current;
  const headingY   = useRef(new Animated.Value(16)).current;
  const previewO   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Icon springs in
    Animated.parallel([
      Animated.spring(iconScale, {toValue: 1, friction: 6, tension: 70, useNativeDriver: true}),
      Animated.timing(iconO, {toValue: 1, duration: 400, useNativeDriver: true}),
    ]).start();
    // Preview card fades in
    Animated.timing(previewO, {toValue: 1, duration: 500, delay: 250, useNativeDriver: true}).start();
    // Heading slides up
    Animated.parallel([
      Animated.timing(headingO, {toValue: 1, duration: 380, delay: 300, useNativeDriver: true}),
      Animated.timing(headingY, {toValue: 0, duration: 380, delay: 300, easing: Easing.out(Easing.quad), useNativeDriver: true}),
    ]).start();
    // Card slides up
    Animated.parallel([
      Animated.timing(cardO, {toValue: 1, duration: 400, delay: 420, useNativeDriver: true}),
      Animated.timing(cardY, {toValue: 0, duration: 400, delay: 420, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true}),
    ]).start();
  }, [iconScale, iconO, cardO, cardY, headingO, headingY, previewO]);

  useEffect(() => {
    if (timer <= 0) return undefined;
    const id = setInterval(() => setTimer(v => v - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const updateOtp = (value, index) => {
    const digit = value.replace(/\D/g, '').slice(0, 1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) refs.current[index + 1]?.focus();
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const filled = otp.every(d => d !== '');

  const handleVerify = async () => {
    if (!filled) return;
    setLoading(true);
    try {
      const response = await authService.verifyOTP(mobile, otp.join(''));
      if (response.success) {
        Alert.alert('✅ Login Successful!', `Welcome ${response.dealer?.name || 'Dealer'}!`, [
          {text: 'Continue', onPress: () => onVerify(response.dealer)},
        ]);
      } else {
        Alert.alert('Error', response.message || 'Verification failed');
        setOtp(['', '', '', '', '', '']);
        refs.current[0]?.focus();
      }
    } catch (error) {
      Alert.alert('Verification Failed', error.message || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      refs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    setLoading(true);
    try {
      const response = await authService.sendOTP(mobile);
      if (response.success) {
        Alert.alert('Success', 'OTP resent successfully');
        setTimer(28);
        setOtp(['', '', '', '', '', '']);
        refs.current[0]?.focus();
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.screen} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{flexGrow: 1}}>

        {/* ── Banner (taller on OTP for lock illustration space) ── */}
        <View style={[s.banner, s.bannerOtp]}>
          <PinkDots />
          {/* Back button sits on top of banner */}
          <Pressable onPress={onBack} style={s.backBtn} hitSlop={12}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Path d="M19 12H5M12 5l-7 7 7 7" stroke="#1A1A1A" strokeWidth={2.2}
                strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
          {/* Lock illustration centred in banner */}
          <View style={s.lockBannerCenter}>
            <Animated.View style={{opacity: iconO, transform: [{scale: iconScale}]}}>
              <LockIllustration />
            </Animated.View>
            {/* OTP display card — shows actual digits when received, dots when not */}
            <Animated.View style={[s.otpPreviewCard, {opacity: previewO}]}>
              {[0,1,2,3,4,5].map(i => (
                <View key={i} style={[s.otpPreviewBox, receivedOTP[i] && s.otpPreviewBoxFilled]}>
                  <Text style={[s.otpPreviewDigit, receivedOTP[i] && s.otpPreviewDigitFilled]}>
                    {receivedOTP[i] ?? '·'}
                  </Text>
                </View>
              ))}
            </Animated.View>
          </View>
          <BannerWave height={40} />
        </View>

        {/* ── Heading ── */}
        <Animated.View style={[s.headingWrap, s.headingWrapOtp, {opacity: headingO, transform: [{translateY: headingY}]}]}>
          <Text style={s.heading}>Verify OTP</Text>
          <Text style={[s.subheading, s.subheadingOtp]}>
            6-digit OTP sent to{' '}
            <Text style={s.mobileHighlight}>+91 {mobile || '9876543210'}</Text>
          </Text>
        </Animated.View>

        {/* ── OTP card ── */}
        <Animated.View style={[s.card, {opacity: cardO, transform: [{translateY: cardY}]}]}>
          {/* 6-box OTP input */}
          <View style={s.otpRow}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={ref => {refs.current[index] = ref;}}
                keyboardType="number-pad"
                maxLength={1}
                value={digit}
                onChangeText={v => updateOtp(v, index)}
                onKeyPress={e => handleKeyPress(e, index)}
                style={[s.otpBox, digit ? s.otpBoxFilled : null]}
              />
            ))}
          </View>

          {/* Timer */}
          <View style={s.timerRow}>
            {/* Circular timer indicator */}
            <View style={s.timerCircle}>
              <Svg width={36} height={36} viewBox="0 0 36 36">
                <Circle cx="18" cy="18" r="15" fill="none" stroke="#F5E6E6" strokeWidth={3} />
                <Circle
                  cx="18" cy="18" r="15"
                  fill="none"
                  stroke={timer > 0 ? RED : '#E0E0E0'}
                  strokeWidth={3}
                  strokeDasharray={`${(timer / 28) * 94.2} 94.2`}
                  strokeLinecap="round"
                  transform="rotate(-90 18 18)"
                />
              </Svg>
              <Text style={s.timerInner}>{timer}</Text>
            </View>
            <Pressable onPress={handleResend} disabled={timer > 0 || loading}>
              <Text style={[s.resendText, timer > 0 && s.resendDisabled]}>
                {timer > 0
                  ? `Resend OTP in `
                  : 'Resend OTP'}
                {timer > 0 && <Text style={s.resendTimer}>{timer}s</Text>}
              </Text>
            </Pressable>
          </View>

          {/* Verify button */}
          <Pressable
            onPress={handleVerify}
            disabled={!filled || loading}
            style={[s.redBtn, (!filled || loading) && s.redBtnDisabled]}>
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Text style={s.redBtnText}>Verify & Continue</Text>
                <View style={s.btnArrow}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path d="M5 12h14M13 6l6 6-6 6" stroke="#FFF" strokeWidth={2.2}
                      strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </View>
              </>
            )}
          </Pressable>

          {/* Security note */}
          <View style={s.secureRow}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" style={{marginRight: 6}}>
              <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                stroke="#9E9E9E" strokeWidth={1.5} fill="none" strokeLinecap="round" />
              <Path d="M9 12l2 2 4-4" stroke="#9E9E9E" strokeWidth={1.5}
                strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Text style={s.secureText}>Your data is secured with 256-bit encryption</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ═══════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════ */
const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  /* ── Banner ── */
  banner: {
    width: '100%',
    height: H * 0.42,
    backgroundColor: '#FFF5F5',
    overflow: 'hidden',
  },
  bannerImg: {
    width: '100%',
    height: '100%',
  },

  /* ── Back button (OTP screen) ── */
  backBtn: {
    position: 'absolute',
    top: 16,
    left: 18,
    zIndex: 20,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },

  /* ── Lock illustration centred in banner ── */
  lockBannerCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingBottom: 0,
  },
  lockWrap: {
    alignItems: 'center',
  },
  lockOuterRing: {
    position: 'absolute',
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: 'rgba(197,31,43,0.07)',
    top: -14,
    left: -14,
  },
  lockCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(197,31,43,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedIconImg: {
    width: 80,
    height: 80,
  },
  lockDots: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 9,
  },
  lockDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(197,31,43,0.20)',
    borderWidth: 1.5,
    borderColor: RED,
  },
  lockDotFilled: {
    backgroundColor: RED,
  },

  /* ── Heading area ── */
  headingWrap: {
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 14,
    alignItems: 'flex-start',
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: 0.2,
    textAlign: 'left',
  },
  subheading: {
    fontSize: 14,
    color: '#757575',
    marginTop: 5,
    textAlign: 'left',
    lineHeight: 20,
  },
  mobileHighlight: {
    color: RED,
    fontWeight: '700',
  },

  /* ── Card ── */
  card: {
    marginHorizontal: 18,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    ...shadow,
  },

  /* ── Label ── */
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  /* ── Phone input row ── */
  inputRow: {
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  inputRowActive: {
    borderColor: RED,
    backgroundColor: '#FFF5F5',
  },
  phoneIconWrap: {
    paddingHorizontal: 12,
  },
  dialCode: {
    paddingRight: 10,
  },
  dialCodeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  dividerLine: {
    width: 1.5,
    height: 28,
    backgroundColor: '#E0E0E0',
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    paddingRight: 14,
  },

  /* ── Red CTA button ── */
  redBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: RED,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    ...shadow,
  },
  redBtnDisabled: {
    opacity: 0.40,
  },
  redBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginRight: 10,
  },
  btnArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Hint box ── */
  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 18,
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderLeftWidth: 3,
    borderLeftColor: RED,
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    color: '#555',
    lineHeight: 19,
  },

  /* ── OR divider ── */
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#EEEEEE',
  },
  orText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#BDBDBD',
    marginHorizontal: 12,
    letterSpacing: 1,
  },

  /* ── Outline button ── */
  outlineBtn: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: RED,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  outlineBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: RED,
  },

  /* ── Security note ── */
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  secureText: {
    fontSize: 12,
    color: '#9E9E9E',
    fontWeight: '500',
  },

  /* ── Feature strip below login card ── */
  featureStrip: {
    marginHorizontal: 18,
    marginTop: 20,
    marginBottom: 32,
    alignItems: 'center',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(197,31,43,0.12)',
  },
  featureChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  featureLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#444',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  featureDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(197,31,43,0.18)',
  },
  featureBottomLine: {
    width: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: RED,
    marginTop: 18,
    marginBottom: 10,
  },
  featureTagline: {
    fontSize: 12,
    color: '#9E9E9E',
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
  },

  /* ── OTP boxes ── */
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  otpBox: {
    width: (W - 36 - 44 - 5 * 8) / 6,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.8,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  otpBoxFilled: {
    borderColor: RED,
    backgroundColor: '#FFF5F5',
    color: RED,
  },

  /* ── Timer row ── */
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    gap: 12,
  },
  timerCircle: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerInner: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '800',
    color: RED,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  resendDisabled: {
    color: '#9E9E9E',
  },
  resendTimer: {
    color: RED,
    fontWeight: '800',
  },

  /* ── OTP preview card (inside banner, below lock) ── */
  otpPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(197,31,43,0.25)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 3},
    elevation: 3,
  },
  otpPreviewBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(197,31,43,0.25)',
  },
  otpPreviewBoxFilled: {
    backgroundColor: RED,
    borderColor: RED,
  },
  otpPreviewDigit: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1A1A1A',
    lineHeight: 22,
  },
  otpPreviewDigitFilled: {
    color: '#FFFFFF',
  },

  /* ── OTP screen overrides ── */
  bannerOtp: {
    height: H * 0.46,
  },
  headingWrapOtp: {
    alignItems: 'flex-start',
    paddingTop: 14,
    paddingBottom: 10,
  },
  subheadingOtp: {
    textAlign: 'left',
  },
});

export default AuthScreens;