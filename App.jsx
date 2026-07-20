import React, {useEffect, useState} from 'react';
import {BackHandler, StatusBar, Alert, View, Text, ActivityIndicator} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import SplashScreen from './src/components/SplashScreen';
import WelcomeScreen from './src/components/WelcomeScreen';
import DealerRegistrationScreen from './src/components/DealerRegistrationScreen';
import RegistrationOtpScreen from './src/components/RegistrationOtpScreen';
import AuthScreens from './src/components/AuthScreens';
import DealerDashboard from './src/components/DealerDashboard';
import apiService from './src/components/services/apiService';
import dealerService from './src/components/services/dealerService';

const Stack = createNativeStackNavigator();

const APP_STAGE = {
  SPLASH: 'splash',
  WELCOME: 'welcome',
  REGISTRATION: 'registration',
  REG_OTP: 'reg_otp',      // OTP verification right after registration
  AUTH: 'auth',
  DASHBOARD: 'dashboard',
};

const SPLASH_DURATION_MS = 3000;

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#fff'}}>
          <Text style={{fontSize: 20, fontWeight: 'bold', color: '#c62828', marginBottom: 10}}>
            App Error
          </Text>
          <Text style={{fontSize: 14, color: '#666', textAlign: 'center'}}>
            {this.state.error?.toString() || 'Something went wrong'}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

function App() {
  const [stage, setStage] = useState(APP_STAGE.SPLASH);
  const [dashboardPage, setDashboardPage] = useState('home');
  const [isReady, setIsReady] = useState(false);
  const [dealerData, setDealerData] = useState(null);
  const [registeredName, setRegisteredName] = useState('');
  const [regFormData, setRegFormData] = useState(null); // registration form data for profile fallback

  useEffect(() => {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🚀 DEALER APP STARTING...');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Current Stage:', stage);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    
    setIsReady(true);
    
    if (stage === APP_STAGE.SPLASH) {
      const splashTimer = setTimeout(() => {
        console.log('✅ Splash complete, moving to Welcome screen');
        setStage(APP_STAGE.WELCOME);
      }, SPLASH_DURATION_MS);

      return () => clearTimeout(splashTimer);
    }
  }, [stage]);

  useEffect(() => {
    console.log('📱 Stage changed to:', stage);
  }, [stage]);

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (stage === APP_STAGE.WELCOME) {
          // On welcome screen, show exit confirmation
          Alert.alert(
            'Exit App',
            'Do you want to exit?',
            [
              {
                text: 'Cancel',
                style: 'cancel',
              },
              {
                text: 'Exit',
                onPress: () => BackHandler.exitApp(),
              },
            ],
            {cancelable: false}
          );
          return true;
        }
        if (stage === APP_STAGE.REGISTRATION) {
          // On registration screen, go back to welcome
          setStage(APP_STAGE.WELCOME);
          return true;
        }
        if (stage === APP_STAGE.AUTH) {
          // On login screen, back goes to welcome
          setStage(APP_STAGE.WELCOME);
          return true;
        }
        if (stage === APP_STAGE.DASHBOARD) {
          // If not on home page, go back to home
          if (dashboardPage !== 'home') {
            setDashboardPage('home');
            return true;
          }
          // If on home page, show exit confirmation
          Alert.alert(
            'Exit App',
            'Do you want to exit?',
            [
              {
                text: 'Cancel',
                style: 'cancel',
              },
              {
                text: 'Exit',
                onPress: () => BackHandler.exitApp(),
              },
            ],
            {cancelable: false}
          );
          return true;
        }
        return false;
      },
    );

    return () => backHandler.remove();
  }, [stage, dashboardPage]);

  if (!isReady) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#071B1A'}}>
        <ActivityIndicator size="large" color="#c62828" />
        <Text style={{color: '#fff', marginTop: 20}}>Loading App...</Text>
      </View>
    );
  }

  if (stage === APP_STAGE.SPLASH) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#071B1A" />
        <SplashScreen />
      </SafeAreaProvider>
    );
  }

  if (stage === APP_STAGE.WELCOME) {
    return (
      <SafeAreaProvider>
        <WelcomeScreen onRegister={() => setStage(APP_STAGE.REGISTRATION)} />
      </SafeAreaProvider>
    );
  }

  if (stage === APP_STAGE.REGISTRATION) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <DealerRegistrationScreen
          onGoToLogin={(name, regData) => {
            console.log('➡️  Going to Login from Registration, name:', name);
            if (name) setRegisteredName(name);
            if (regData) setRegFormData(regData);
            setStage(APP_STAGE.AUTH);
          }}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#071B1A" />
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              animation: 'fade',
            }}>
            {stage === APP_STAGE.AUTH ? (
              <Stack.Screen name="Auth">
                {() => (
                  <AuthScreens
                    registeredName={registeredName}
                    onAuthenticated={(dealer) => {
                      console.log('✅ Authentication successful:', dealer);
                      setDealerData(dealer || null);
                      setStage(APP_STAGE.DASHBOARD);
                    }}
                    onGoToRegister={() => {
                      console.log('➡️  Going to Registration from Login');
                      setStage(APP_STAGE.REGISTRATION);
                    }}
                  />
                )}
              </Stack.Screen>
            ) : (
              <Stack.Screen name="Dashboard">
                {() => (
                  <DealerDashboard 
                    dealer={dealerData || regFormData}
                    onLogout={async () => {
                      console.log('🚪 Logging out...');
                      // Clear stored auth data
                      await apiService.removeToken().catch(() => {});
                      await dealerService.clearLocalProfile().catch(() => {});
                      setDealerData(null);
                      setRegFormData(null);
                      setStage(APP_STAGE.SPLASH);
                    }}
                    activePage={dashboardPage}
                    onPageChange={setDashboardPage}
                  />
                )}
              </Stack.Screen>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

export default App;