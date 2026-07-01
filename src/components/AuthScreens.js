import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  StatusBar,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, shadow} from './theme';
import authService from './services/authService';
import BrandLogo from './BrandLogo';

const AUTH_SCREEN = {
  LOGIN: 'login',
  OTP: 'otp',
};

function AuthScreens({onAuthenticated}) {
  const [screen, setScreen] = useState(AUTH_SCREEN.LOGIN);
  const [mobile, setMobile] = useState('');
  const [currentOTP, setCurrentOTP] = useState('');

  if (screen === AUTH_SCREEN.OTP) {
    return (
      <OtpScreen
        mobile={mobile}
        receivedOTP={currentOTP}
        onBack={() => {
          setScreen(AUTH_SCREEN.LOGIN);
          setCurrentOTP('');
        }}
        onVerify={onAuthenticated}
      />
    );
  }

  return (
    <LoginScreen
      mobile={mobile}
      setMobile={setMobile}
      onOtp={(otp) => {
        setCurrentOTP(otp);
        setScreen(AUTH_SCREEN.OTP);
      }}
    />
  );
}

function LoginScreen({mobile, setMobile, onOtp}) {
  const [loading, setLoading] = useState(false);
  const canSubmit = mobile.length === 10;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    
    setLoading(true);
    console.log('🚀 Sending OTP to:', mobile);
    
    try {
      const response = await authService.sendOTP(mobile);
      
      if (response.success) {
        if (response.otp) {
          console.log('✅ OTP Received:', response.otp);
          onOtp(response.otp);
        } else {
          onOtp('');
        }
      } else {
        Alert.alert('❌ Error', response.message || 'Failed to send OTP');
      }
    } catch (error) {
      Alert.alert('❌ Connection Error', error.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.authScreen} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F8F8" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.authKeyboard}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.authBody}>
          
          {/* Top Banner Section */}
          <View style={styles.bannerContainer}>
            <Image
              source={require('./assets/login.png')}
              style={styles.bannerImage}
              resizeMode="cover"
            />
          </View>

          {/* Middle Section */}
          <View style={styles.contentContainer}>
            <Text style={styles.authTitle}>Dealer Login</Text>
            <Text style={styles.authSubtitle}>
              Login to your Sri Chakra dealer account
            </Text>
          </View>

          {/* Bottom Section - Login Card */}
          <View style={styles.loginCard}>
            <Text style={styles.inputLabel}>Mobile Number</Text>
            <View style={styles.phoneRow}>
              <Text style={styles.countryCode}>+91</Text>
              <TextInput
                keyboardType="number-pad"
                maxLength={10}
                value={mobile}
                onChangeText={value => setMobile(value.replace(/\D/g, ''))}
                placeholder="9876543210"
                placeholderTextColor="#9E9E9E"
                style={styles.input}
              />
            </View>

            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit || loading}
              style={[styles.primaryButton, (!canSubmit || loading) && styles.buttonDisabled]}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Send OTP</Text>
              )}
            </Pressable>

            <Text style={styles.helpText}>
              First time? Contact Sri Chakra sales team for dealer onboarding.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function OtpScreen({mobile, receivedOTP = '', onVerify, onBack}) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(30);
  const [loading, setLoading] = useState(false);
  const refs = useRef([]);

  useEffect(() => {
    if (timer <= 0) return undefined;
    const id = setInterval(() => setTimer(value => value - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const updateOtp = (value, index) => {
    const digit = value.replace(/\D/g, '').slice(0, 1);
    const nextOtp = [...otp];
    nextOtp[index] = digit;
    setOtp(nextOtp);

    if (digit && index < 5) {
      refs.current[index + 1]?.focus();
    }
  };

  const filled = otp.every(item => item);

  const handleVerifyOTP = async () => {
    if (!filled) return;
    
    const otpCode = otp.join('');
    console.log('🔐 Verifying OTP:', otpCode);
    
    setLoading(true);
    try {
      const response = await authService.verifyOTP(mobile, otpCode);
      
      if (response.success) {
        console.log('✅ Login Successful!');
        Alert.alert(
          '✅ Login Successful!', 
          `Welcome ${response.dealer?.name || 'Dealer'}!`,
          [{ text: 'Continue', onPress: () => onVerify(response.dealer) }]
        );
      } else {
        Alert.alert('❌ Error', response.message || 'Verification failed');
        setOtp(['', '', '', '', '', '']);
        refs.current[0]?.focus();
      }
    } catch (error) {
      Alert.alert('❌ Verification Failed', error.message || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      refs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (timer > 0) return;
    
    setLoading(true);
    try {
      const response = await authService.sendOTP(mobile);
      if (response.success) {
        Alert.alert('✅ Success', 'OTP resent successfully');
        setTimer(30);
        setOtp(['', '', '', '', '', '']);
        refs.current[0]?.focus();
      }
    } catch (error) {
      Alert.alert('❌ Error', error.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.authScreen} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F8F8" />
      <ScrollView 
        contentContainerStyle={styles.otpBody}
        keyboardShouldPersistTaps="handled">
        {/* Top Banner Section - Same as Login */}
        <View style={styles.bannerContainer}>
          <Image
            source={require('./assets/login.png')}
            style={styles.bannerImage}
            resizeMode="cover"
          />
        </View>
        
        <Pressable onPress={onBack} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#1A1A1A" />
        </Pressable>

        <View style={styles.otpContentContainer}>
          <Text style={styles.authTitle}>Verify OTP</Text>
          <Text style={styles.authSubtitle}>
            6-digit OTP sent to +91 {mobile || '9876543210'}
          </Text>
          
          {/* OTP Display Card */}
          {receivedOTP && (
            <View style={styles.otpDisplayCard}>
              <View style={styles.otpCardHeader}>
                <Icon name="shield-check" size={24} color={colors.red} />
                <Text style={styles.otpCarcddTitle}>Your OTP Number</Text>
              </View>
              
              <View style={styles.otpCodeRow}>
                {receivedOTP.split('').map((digit, index) => (
                  <View key={index} style={styles.otpDigit}>
                    <Text style={styles.otpDigitText}>{digit}</Text>
                  </View>
                ))}
              </View>
              
              <Text style={styles.otpCardHint}>Enter this code below</Text>
            </View>
          )}

          <View style={styles.otpRow}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={ref => {
                  refs.current[index] = ref;
                }}
                keyboardType="number-pad"
                maxLength={1}
                value={digit}
                onChangeText={value => updateOtp(value, index)}
                style={[styles.otpInput, digit && styles.otpInputFilled]}
              />
            ))}
          </View>

          <Pressable
            disabled={!filled || loading}
            onPress={handleVerifyOTP}
            style={[styles.primaryButton, (!filled || loading) && styles.buttonDisabled]}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Verify & Continue</Text>
            )}
          </Pressable>

          <Pressable
            disabled={timer > 0 || loading}
            onPress={handleResendOTP}
            style={styles.resendButton}>
            <Text style={[styles.resendText, (timer > 0 || loading) && {opacity: 0.5}]}>
              {loading ? 'Sending...' : timer > 0 ? `Resend OTP in ${timer}s` : 'Resend OTP'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  authScreen: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  authKeyboard: {
    flex: 1,
  },
  authBody: {
    flexGrow: 1,
  },
  bannerContainer: {
    width: '100%',
    height: 300,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
  },
  authTitle: {
    color: '#1A1A1A',
    fontSize: 34,
    fontWeight: 'bold',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  authSubtitle: {
    color: '#757575',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 10,
  },
  loginCard: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    padding: 24,
    ...shadow,
  },
  inputLabel: {
    color: '#1A1A1A',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 10,
    letterSpacing: 0.6,
  },
  phoneRow: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  countryCode: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 18,
    borderRightWidth: 1.5,
    borderRightColor: '#E0E0E0',
  },
  input: {
    flex: 1,
    color: '#1A1A1A',
    fontSize: 16,
    paddingHorizontal: 16,
    fontWeight: '600',
  },
  primaryButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    ...shadow,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  helpText: {
    color: '#757575',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 20,
  },
  otpBody: {
    flexGrow: 1,
  },
  otpContentContainer: {
    padding: 24,
    paddingTop: 28,
  },
  backButton: {
    position: 'absolute',
    top: 30,
    left: 24,
    paddingVertical: 8,
    paddingHorizontal: 8,
    zIndex: 10,
  },
  otpLogoArea: {
    alignItems: 'center',
    marginBottom: 28,
  },
  otpDisplayCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.red,
    padding: 12,
    marginTop: 20,
    marginBottom: 6,
    ...shadow,
  },
  otpCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  otpCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1A1A1A',
    marginLeft: 6,
  },
  otpCodeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  otpDigit: {
    width: 32,
    height: 38,
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  otpDigitText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.red,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  otpCardHint: {
    fontSize: 11,
    color: '#757575',
    textAlign: 'center',
    fontWeight: '600',
  },
  otpRow: {
    flexDirection: 'row',
    marginTop: 28,
    marginBottom: 10,
    justifyContent: 'space-between',
    width: '100%',
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    color: '#1A1A1A',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  otpInputFilled: {
    borderColor: colors.red,
    backgroundColor: '#FFF5F5',
  },
  resendButton: {
    marginTop: 16,
    padding: 10,
  },
  resendText: {
    color: '#757575',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default AuthScreens;
