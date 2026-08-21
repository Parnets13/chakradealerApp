import React, { useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: W, height: H } = Dimensions.get('window');
const PRIMARY    = '#E8374A';   // Brand logo red
const WHITE      = '#FFFFFF';
const DARK       = '#0F172A';
const GREY       = '#6B7280';
const GREY_LIGHT = '#F1F4F8';

export default function WelcomeScreen({ onRegister, onLogin }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        delay: 300,
        useNativeDriver: true
      })
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#B5001A" />

      {/* Brand red top strip */}
      <View style={styles.smallRedHeader} />
      
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.welcomeContainer,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          {/* Logo */}
          <View style={styles.logoBox}>
            <Image
              source={require('./assets/sri-chakra-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          
          <View style={styles.textContainer}>
            <Text style={styles.welcomeSubheading}>Welcome to</Text>
            
            <View style={styles.headingContainer}>
              <Text style={styles.headingCompany}>Sri Chakra Industries</Text>
            </View>
          </View>
          

          {/* Feature Cards */}
          <View style={styles.featuresContainer}>
            <View style={styles.featureCard}>
              <View style={styles.featureIconBox}>
                <Text style={styles.featureIcon}>📦</Text>
              </View>
              <Text style={styles.featureTitle}>Easy Order Placement</Text>
              <Text style={styles.featureDesc}>Place and manage your product orders quickly and securely.</Text>
            </View>

            <View style={styles.featureCard}>
              <View style={styles.featureIconBox}>
                <Text style={styles.featureIcon}>🚚</Text>
              </View>
              <Text style={styles.featureTitle}>Live Order Tracking</Text>
              <Text style={styles.featureDesc}>Track your order status in real time from dispatch to delivery.</Text>
            </View>
          </View>

          {/* Button and Footer */}
          <Pressable style={styles.registerButton} onPress={onRegister}>
            <Text style={styles.registerButtonText}>New Registration →</Text>
          </Pressable>

          {/* Already registered — Login */}
          <Pressable style={styles.loginButton} onPress={onLogin}>
            <Text style={styles.loginButtonText}>Already Registered? Login here</Text>
          </Pressable>

          <Text style={styles.footer}>
            Only authorized Sri Chakra Industries dealers can access this application.
          </Text>

        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GREY_LIGHT
  },
  smallRedHeader: {
    width: W,
    height: H * 0.05,
    backgroundColor: PRIMARY,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: H * 0.08
  },
  welcomeContainer: {
    alignItems: 'center',
    width: '100%'
  },
  logoBox: {
    width: W * 0.42,
    height: W * 0.22,
    backgroundColor: WHITE,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#1B2A4A',
    shadowOpacity: 0.10,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E4E9F0',
  },
  logoImage: {
    width: '90%',
    height: '70%'
  },
  textContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24
  },
  welcomeSubheading: {
    fontSize: 22,
    fontWeight: '700',
    color: GREY,
    marginBottom: 4,
    textAlign: 'center',
  },
  headingContainer: {
    alignItems: 'center',
    marginBottom: 10,
    width: '100%'
  },
  headingCompany: {
    fontSize: 22,
    fontWeight: '900',
    color: DARK,
    textAlign: 'center',
    lineHeight: 28
  },
  description: {
    fontSize: 14,
    color: GREY,
    textAlign: 'left',
    lineHeight: 20,
    marginBottom: 0,
    paddingHorizontal: 0
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 20
  },
  featureCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E4E9F0',
    shadowColor: '#1B2A4A',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  featureIconBox: {
    width: 36,
    height: 36,
    backgroundColor: GREY_LIGHT,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureIcon: {
    fontSize: 16
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: DARK,
    marginBottom: 2
  },
  featureDesc: {
    fontSize: 12,
    color: GREY,
    lineHeight: 16
  },
  registerButton: {
    backgroundColor: PRIMARY,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 16,
    alignSelf: 'stretch',
    marginBottom: 10,
    shadowColor: '#1B2A4A',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  registerButtonText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  loginButton: {
    borderWidth: 1.5,
    borderColor: PRIMARY,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 16,
    alignSelf: 'stretch',
    marginTop: 8,
    marginBottom: 10,
    backgroundColor: '#FFF0F2',
  },
  loginButtonText: {
    color: PRIMARY,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  footer: {
    fontSize: 10,
    color: GREY,
    textAlign: 'center',
    lineHeight: 14,
    paddingHorizontal: 20
  },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 4,
  },
  loginRowText: {
    fontSize: 13,
    color: GREY,
    fontWeight: '500',
  },
  loginRowLink: {
    fontSize: 13,
    color: PRIMARY,
    fontWeight: '700',
  },
});
