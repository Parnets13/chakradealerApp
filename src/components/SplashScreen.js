/**
 * SplashScreen.js – Sri Chakra Industries
 * Layout:
 *   TOP    : Red curved header (SVG wave)
 *   CENTER : sri-chakra-logo.png perfectly centered
 *   BOTTOM : Red curved footer (SVG wave) + tagline text
 */

import React, {useEffect, useRef} from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, {Defs, LinearGradient, Path, Stop} from 'react-native-svg';

const {width: W, height: H} = Dimensions.get('window');
const PRIMARY   = '#C8102E';
const PRIMARY_D = '#9B0020';
const WHITE     = '#FFFFFF';

/* ── Top curved header ───────────────────────────────────── */
function TopCurve() {
  const CH = H * 0.22;
  return (
    <View style={styles.topCurveWrap} pointerEvents="none">
      <Svg width={W} height={CH} viewBox={`0 0 ${W} ${CH}`}>
        <Defs>
          <LinearGradient id="tg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={PRIMARY} stopOpacity="1" />
            <Stop offset="100%" stopColor={PRIMARY_D} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        {/* main filled header */}
        <Path
          d={`M0,0 L${W},0 L${W},${CH * 0.72}
             Q${W * 0.75},${CH * 1.08} ${W * 0.5},${CH * 0.82}
             Q${W * 0.25},${CH * 0.56} 0,${CH * 0.88} Z`}
          fill="url(#tg)"
        />
        {/* subtle second layer for depth */}
        <Path
          d={`M0,0 L${W},0 L${W},${CH * 0.55}
             Q${W * 0.7},${CH * 0.98} ${W * 0.5},${CH * 0.68}
             Q${W * 0.28},${CH * 0.38} 0,${CH * 0.65} Z`}
          fill={WHITE}
          fillOpacity={0.08}
        />
      </Svg>
    </View>
  );
}

/* ── Bottom curved footer ────────────────────────────────── */
function BottomCurve() {
  const BH = H * 0.26;
  return (
    <View style={styles.bottomCurveWrap} pointerEvents="none">
      <Svg width={W} height={BH} viewBox={`0 0 ${W} ${BH}`}>
        <Defs>
          <LinearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={PRIMARY_D} stopOpacity="1" />
            <Stop offset="100%" stopColor={PRIMARY} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        {/* main filled footer */}
        <Path
          d={`M0,${BH * 0.28}
             Q${W * 0.25},${BH * -0.08} ${W * 0.5},${BH * 0.18}
             Q${W * 0.75},${BH * 0.44} ${W},${BH * 0.12}
             L${W},${BH} L0,${BH} Z`}
          fill="url(#bg)"
        />
        {/* subtle overlay wave */}
        <Path
          d={`M0,${BH * 0.48}
             Q${W * 0.3},${BH * 0.22} ${W * 0.55},${BH * 0.40}
             Q${W * 0.78},${BH * 0.58} ${W},${BH * 0.38}
             L${W},${BH} L0,${BH} Z`}
          fill={WHITE}
          fillOpacity={0.07}
        />
      </Svg>
    </View>
  );
}

/* ── Main SplashScreen ───────────────────────────────────── */
function SplashScreen() {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.82)).current;
  const slideUp   = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 850,
        delay: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 750,
        delay: 200,
        easing: Easing.out(Easing.back(1.3)),
        useNativeDriver: true,
      }),
      Animated.timing(slideUp, {
        toValue: 0,
        duration: 700,
        delay: 350,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim, slideUp]);

  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ── Top red curved header ── */}
      <TopCurve />

      {/* ── Center: logo + text below logo ── */}
      <View style={styles.centerBlock}>
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{scale: scaleAnim}],
            alignItems: 'center',
          }}>
          <Image
            source={require('./assets/sri-chakra-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          {/* text directly below logo */}
          <Animated.View
            style={[
              styles.textBelowLogo,
              {opacity: fadeAnim, transform: [{translateY: slideUp}]},
            ]}>
            <Text style={styles.dealerApp}>Dealer App</Text>
            <Text style={styles.tagline}>Manage Orders. Track Easily. Grow Together.</Text>
            <View style={styles.dotsRow}>
              <View style={[styles.dot, styles.dotActive]} />
              <View style={styles.dot} />
              <View style={styles.dot} />
            </View>
          </Animated.View>
        </Animated.View>
      </View>

      {/* ── Bottom red curved footer ── */}
      <View style={styles.bottomBlock}>
        <BottomCurve />
      </View>
    </View>
  );
}

/* ── Styles ──────────────────────────────────────────────── */
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  /* top curve */
  topCurveWrap: {
    width: W,
    height: H * 0.22,
  },

  /* center logo block */
  centerBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: W * 0.55,
    height: W * 0.55,
  },

  /* bottom block */
  bottomBlock: {
    width: W,
    height: H * 0.26,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  /* text below logo */
  textBelowLogo: {
    alignItems: 'center',
    marginTop: 2,
  },
  dealerApp: {
    color: PRIMARY,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 0,
    marginBottom: 4,
  },
  tagline: {
    color: '#555555',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 7,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(200,16,46,0.25)',
  },
  dotActive: {
    width: 26,
    height: 8,
    borderRadius: 4,
    backgroundColor: PRIMARY,
  },
});

export default SplashScreen;
