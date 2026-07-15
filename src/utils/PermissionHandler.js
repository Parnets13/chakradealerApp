/**
 * PermissionHandler.js
 * Production-ready Android Camera Permission Handler
 * Handles: Request, Check, Deny, Don't Ask Again scenarios
 */

import {Alert, Linking, PermissionsAndroid, Platform} from 'react-native';

/**
 * Check if Camera permission is already granted
 * @returns {Promise<boolean>}
 */
export const checkCameraPermission = async () => {
  if (Platform.OS !== 'android') return true;

  try {
    const granted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.CAMERA
    );
    return granted;
  } catch (err) {
    console.error('Error checking camera permission:', err);
    return false;
  }
};

/**
 * Request Camera permission with proper messaging
 * @returns {Promise<'granted' | 'denied' | 'never_ask_again'>}
 */
export const requestCameraPermission = async () => {
  if (Platform.OS !== 'android') return 'granted';

  try {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Camera Permission Required',
        message:
          'Sri Chakra Dealer App needs access to your camera to capture your profile photo.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Deny',
        buttonPositive: 'Allow',
      }
    );

    if (result === PermissionsAndroid.RESULTS.GRANTED) {
      return 'granted';
    } else if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      return 'never_ask_again';
    } else {
      return 'denied';
    }
  } catch (err) {
    console.error('Error requesting camera permission:', err);
    return 'denied';
  }
};

/**
 * Handle permission denial - show appropriate message or settings prompt
 * @param {string} status - 'denied' | 'never_ask_again'
 * @returns {Promise<void>}
 */
export const handlePermissionDenied = async (status) => {
  if (status === 'never_ask_again') {
    // User selected "Don't Ask Again" - prompt to open settings
    Alert.alert(
      'Camera Permission Required',
      'Camera access is required to capture your profile photo. Please enable Camera permission in your device settings.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Open Settings',
          onPress: () => {
            Linking.openSettings().catch(() => {
              Alert.alert(
                'Error',
                'Unable to open settings. Please enable Camera permission manually in your device settings.'
              );
            });
          },
        },
      ],
      {cancelable: false}
    );
  } else {
    // User denied permission normally
    Alert.alert(
      'Camera Permission Denied',
      'Camera access is required to capture your profile photo. Please allow camera permission to continue.',
      [{text: 'OK'}]
    );
  }
};

/**
 * Main function: Check and request camera permission
 * Opens settings dialog if needed, returns true if permission granted
 * @returns {Promise<boolean>}
 */
export const ensureCameraPermission = async () => {
  if (Platform.OS !== 'android') return true;

  // First check if permission is already granted
  const hasPermission = await checkCameraPermission();
  if (hasPermission) return true;

  // Request permission
  const result = await requestCameraPermission();

  if (result === 'granted') {
    return true;
  }

  // Handle denial
  await handlePermissionDenied(result);
  return false;
};
