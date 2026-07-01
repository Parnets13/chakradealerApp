import React, {useEffect, useState} from 'react';
import {BackHandler, StatusBar, Alert, View, Text, ActivityIndicator} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import SplashScreen from './src/components/SplashScreen';
import AuthScreens from './src/components/AuthScreens';
import DealerDashboard from './src/components/DealerDashboard';

const Stack = createNativeStackNavigator();

const APP_STAGE = {
  SPLASH: 'splash',
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

  useEffect(() => {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🚀 DEALER APP STARTING...');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Current Stage:', stage);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    
    setIsReady(true);
    
    const splashTimer = setTimeout(() => {
      console.log('✅ Splash complete, moving to Auth screen');
      setStage(APP_STAGE.AUTH);
    }, SPLASH_DURATION_MS);

    return () => clearTimeout(splashTimer);
  }, []);

  useEffect(() => {
    console.log('📱 Stage changed to:', stage);
  }, [stage]);

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
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
                    onAuthenticated={(dealer) => {
                      console.log('✅ Authentication successful:', dealer);
                      setStage(APP_STAGE.DASHBOARD);
                    }}
                  />
                )}
              </Stack.Screen>
            ) : (
              <Stack.Screen name="Dashboard">
                {() => (
                  <DealerDashboard 
                    onLogout={() => {
                      console.log('🚪 Logging out...');
                      setStage(APP_STAGE.AUTH);
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