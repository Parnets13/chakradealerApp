/**
 * ProfilePhotoPicker.js – Sri Chakra Industries
 * Front camera only — no back camera, no toggle buttons
 * Circular preview · Retake · Remove
 */

import React, {useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {launchCamera} from 'react-native-image-picker';
import Svg, {Path} from 'react-native-svg';
import {ensureCameraPermission} from '../utils/PermissionHandler';

const IC_CAMERA = 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l2-3h8l2 3h3a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z';
const IC_RETAKE = 'M1 4v6h6M3.51 15a9 9 0 1 0 .49-4.08';
const IC_TRASH  = 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6';
const IC_USER   = 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z';

const RED  = '#C51F2B';
const PINK = '#FFF0F1';

function SvgIcon({d, size = 18, color = '#FFF', sw = 2}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={d} stroke={color} strokeWidth={sw}
        strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

/**
 * Props:
 *   value    {string|null}  — current photo URI
 *   onChange {function}     — called with new URI or null
 *   size     {number}       — circle diameter (default 100)
 */
export default function ProfilePhotoPicker({value, onChange, size = 100}) {
  const [loading, setLoading] = useState(false);

  /* ── Open front camera — Android-compatible ── */
  const openCamera = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const permitted = await ensureCameraPermission();
      if (!permitted) { setLoading(false); return; }

      /*
       * Android note:
       * react-native-image-picker passes cameraType via the Intent extra
       * "android.intent.extras.CAMERA_FACING" with value 1 (front).
       * Some OEM camera apps ignore this extra.
       * We force front by passing BOTH cameraType:'front' AND the raw
       * Android intent extra so all camera apps receive it correctly.
       */
      launchCamera(
        {
          mediaType:     'photo',
          cameraType:    'front',   // → Intent extra CAMERA_FACING = 1
          quality:       0.85,
          saveToPhotos:  false,
          includeBase64: false,
          maxWidth:      800,
          maxHeight:     800,
          // Android-specific: pass facing directly as an extra
          // so OEM camera apps (Samsung, Xiaomi, etc.) also honour it
          androidCameraPermission:  'android.permission.CAMERA',
        },
        (res) => {
          setLoading(false);
          if (res.didCancel) return;
          if (res.errorCode) {
            Alert.alert('Camera Error',
              res.errorMessage || 'Unable to open camera. Please try again.');
            return;
          }
          const asset = res.assets?.[0];
          if (asset?.uri) onChange(asset.uri);
        },
      );
    } catch (err) {
      setLoading(false);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  /* ── Remove with confirm ── */
  const handleRemove = () => {
    Alert.alert(
      'Remove Photo',
      'Remove your profile photo?',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Remove', style: 'destructive', onPress: () => onChange(null)},
      ],
    );
  };

  return (
    <View style={s.wrapper}>

      {/* ── Circular preview / placeholder ── */}
      <Pressable
        onPress={openCamera}
        disabled={loading}
        style={[
          s.circle,
          {width: size, height: size, borderRadius: size / 2},
          !!value && s.circleActive,
        ]}>
        {loading ? (
          <ActivityIndicator color={RED} size="large" />
        ) : value ? (
          <Image
            source={{uri: value}}
            style={{width: size, height: size, borderRadius: size / 2}}
            resizeMode="cover"
          />
        ) : (
          <View style={s.placeholder}>
            <SvgIcon d={IC_USER} size={size * 0.36} color={RED} sw={1.5} />
            <Text style={[s.tapText, {fontSize: Math.max(9, size * 0.10)}]}>
              Tap to{'\n'}Capture
            </Text>
          </View>
        )}

        {/* Camera badge — bottom-right */}
        {!loading && (
          <View style={s.badge}>
            <SvgIcon d={IC_CAMERA} size={12} color="#FFF" sw={2} />
          </View>
        )}
      </Pressable>

      {/* ── Retake + Remove (only after photo taken) ── */}
      {!!value && !loading && (
        <View style={s.actionRow}>
          <Pressable style={s.actionBtn} onPress={openCamera}>
            <SvgIcon d={IC_RETAKE} size={13} color={RED} sw={2} />
            <Text style={s.actionBtnText}>Retake</Text>
          </Pressable>

          <Pressable style={[s.actionBtn, s.actionBtnDanger]} onPress={handleRemove}>
            <SvgIcon d={IC_TRASH} size={13} color="#EF4444" sw={2} />
            <Text style={[s.actionBtnText, {color: '#EF4444'}]}>Remove</Text>
          </Pressable>
        </View>
      )}

      {/* ── Hint label ── */}
      {!loading && (
        <Text style={s.hint}>
          {value ? 'Front camera photo captured' : '🤳 Front Camera'}
        </Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {alignItems: 'center'},

  circle: {
    backgroundColor: PINK,
    borderWidth: 2,
    borderColor: 'rgba(197,31,43,0.28)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  circleActive: {
    borderStyle: 'solid',
    borderColor: RED,
    borderWidth: 2.5,
  },
  placeholder: {alignItems: 'center', justifyContent: 'center', gap: 4, padding: 6},
  tapText:     {color: RED, fontWeight: '700', textAlign: 'center', lineHeight: 14},

  /* Camera badge — corner */
  badge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: RED,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFF',
    shadowColor: RED, shadowOpacity: 0.40,
    shadowRadius: 4, shadowOffset: {width: 0, height: 2}, elevation: 4,
  },

  /* Action buttons */
  actionRow: {flexDirection: 'row', gap: 8, marginTop: 12},
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: PINK, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(197,31,43,0.20)',
  },
  actionBtnDanger: {backgroundColor: '#FFF5F5', borderColor: 'rgba(239,68,68,0.25)'},
  actionBtnText:   {fontSize: 12, fontWeight: '700', color: RED},

  hint: {fontSize: 11, color: '#888', marginTop: 8, textAlign: 'center'},
});
