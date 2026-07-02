/**
 * SplashScreen.js – Sri Chakra Industries
 * Layout: Normal flex column — no absolute positioned logo overlay
 *   TOP:    sri-chakra-logo.png  (part of screen, not floating navbar)
 *   MIDDLE: login icon.png in soft circle + tagline
 *   BOTTOM: handshake (left) + login icon (right) on city bg + red wave
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
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

const {width: W, height: H} = Dimensions.get('window');
const PRIMARY   = '#C8102E';
const PRIMARY_D = '#A0001C';
const WHITE     = '#FFFFFF';

/* ─── Floating outline icons ─────────────────────────────── */
const FLOAT_ICONS = [
  { key: 'cb',  x: W*0.07, y: H*0.09,  path: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z' },
  { key: 'bx',  x: W*0.86, y: H*0.08,  path: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12' },
  { key: 'bg',  x: W*0.05, y: H*0.23,  path: 'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0' },
  { key: 'tr',  x: W*0.84, y: H*0.24,  path: 'M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM18.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z' },
  { key: 'dc',  x: W*0.05, y: H*0.37,  path: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8' },
  { key: 'hs',  x: W*0.82, y: H*0.38,  path: 'M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z' },
];

function FloatIcon({data, delay}) {
  const drift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(drift, {toValue: 1, duration: 2800 + delay * 320, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
      Animated.timing(drift, {toValue: 0, duration: 2800 + delay * 320, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
    ])).start();
  }, [drift, delay]);
  const ty = drift.interpolate({inputRange: [0,1], outputRange: [0, -7]});
  const tx = drift.interpolate({inputRange: [0,1], outputRange: [0, delay % 2 === 0 ? 3 : -3]});
  return (
    <Animated.View style={[styles.floatIcon, {left: data.x - 15, top: data.y - 15}, {transform: [{translateY: ty}, {translateX: tx}]}]}>
      <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
        <Path d={data.path} stroke={PRIMARY} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </Svg>
    </Animated.View>
  );
}

/* ─── Dotted world map ───────────────────────────────────── */
const COLS=28, ROWS=10, MAP_W=W*0.86, MAP_H=H*0.18;
const DX=MAP_W/COLS, DY=MAP_H/ROWS;
const MASK=[
  [0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,1,1,1,1,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,0,0,0,0,1,1,0,0,0,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,0,0,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0],
  [0,0,0,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,0,0,1,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0],
];
function WorldMap() {
  const dots = [];
  for (let r=0; r<ROWS; r++)
    for (let c=0; c<COLS; c++)
      if (MASK[r] && MASK[r][c]) dots.push({x: c*DX+DX/2, y: r*DY+DY/2});
  return (
    <View style={styles.mapWrap} pointerEvents="none">
      <Svg width={MAP_W} height={MAP_H} viewBox={`0 0 ${MAP_W} ${MAP_H}`}>
        {dots.map((d,i) => <Circle key={i} cx={d.x} cy={d.y} r={2} fill={PRIMARY} fillOpacity={0.13}/>)}
      </Svg>
    </View>
  );
}

/* ─── Bottom red wave ────────────────────────────────────── */
function BottomWave() {
  const WH = H * 0.20;
  return (
    <Svg width={W} height={WH} viewBox={`0 0 ${W} ${WH}`} style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={PRIMARY} stopOpacity="1"/>
          <Stop offset="100%" stopColor={PRIMARY_D} stopOpacity="1"/>
        </LinearGradient>
      </Defs>
      <Path
        d={`M0,${WH*0.42} Q${W*0.15},${WH*0.04} ${W*0.35},${WH*0.28}
           Q${W*0.55},${WH*0.52} ${W*0.70},${WH*0.22}
           Q${W*0.85},0 ${W},${WH*0.16} L${W},${WH} L0,${WH} Z`}
        fill="url(#wg)"
      />
      <Path
        d={`M0,${WH*0.62} Q${W*0.22},${WH*0.34} ${W*0.46},${WH*0.50}
           Q${W*0.70},${WH*0.66} ${W},${WH*0.46} L${W},${WH} L0,${WH} Z`}
        fill={PRIMARY_D} fillOpacity={0.4}
      />
    </Svg>
  );
}

/* ─── Main SplashScreen ──────────────────────────────────── */
function SplashScreen() {
  const fadeAll    = useRef(new Animated.Value(0)).current;
  const logoY      = useRef(new Animated.Value(-20)).current;
  const iconScale  = useRef(new Animated.Value(0.85)).current;
  const glowPulse  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    /* everything fades in together */
    Animated.parallel([
      Animated.timing(fadeAll, {toValue:1, duration:800, delay:150, easing:Easing.out(Easing.quad), useNativeDriver:true}),
      Animated.timing(logoY,   {toValue:0, duration:700, delay:150, easing:Easing.out(Easing.back(1.4)), useNativeDriver:true}),
      Animated.spring(iconScale, {toValue:1, delay:350, friction:7, tension:55, useNativeDriver:true}),
    ]).start();
    /* glow pulse */
    Animated.loop(Animated.sequence([
      Animated.timing(glowPulse, {toValue:1, duration:1600, easing:Easing.inOut(Easing.sin), useNativeDriver:true}),
      Animated.timing(glowPulse, {toValue:0, duration:1600, easing:Easing.inOut(Easing.sin), useNativeDriver:true}),
    ])).start();
  }, [fadeAll, logoY, iconScale, glowPulse]);

  const glowOpacity = glowPulse.interpolate({inputRange:[0,1], outputRange:[0.08,0.28]});

  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content"/>

      {/* ── background layers (absolute, behind everything) ── */}
      <WorldMap/>
      {FLOAT_ICONS.map((ic,i) => <FloatIcon key={ic.key} data={ic} delay={i}/>)}

      {/* ══════════════════════════════════════════════════════
          FLEX COLUMN — logo + icon + tagline + bottom
          All part of the SAME screen, no separate navbar/bar
      ══════════════════════════════════════════════════════ */}
      <View style={styles.flexCol}>

        {/* ── 1. Logo — top of screen, part of normal flow ── */}
        <Animated.View style={[styles.logoRow, {opacity:fadeAll, transform:[{translateY:logoY}]}]}>
          <Image
            source={require('./assets/sri-chakra-logo.png')}
            style={styles.logoImg}
            resizeMode="contain"
          />
        </Animated.View>

        {/* ── 2. Center icon in soft circle ── */}
        <Animated.View style={[styles.iconCircleWrap, {opacity:fadeAll, transform:[{scale:iconScale}]}]}>
          {/* soft glow behind circle */}
          <Animated.View style={[styles.glowDot, {opacity:glowOpacity}]}/>
          {/* pink circle bg */}
          <View style={styles.circleBg}/>
          <Image
            source={require('./assets/login icon.png')}
            style={styles.centerIcon}
            resizeMode="contain"
          />
        </Animated.View>

        {/* ── 3. Tagline ── */}
        <Animated.View style={[styles.taglineRow, {opacity:fadeAll}]}>
          <Text style={styles.tagline}>
            {'Manage Orders. Track Easily. Grow Together.'}
          </Text>
          <View style={styles.divider}/>
        </Animated.View>

        {/* ── 4. Bottom illustration + wave ── */}
        <View style={styles.bottomBlock}>

          {/* city building silhouette */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Svg width={W} height={'100%'} viewBox={`0 0 ${W} 200`} style={StyleSheet.absoluteFill}>
              {[W*0.04,W*0.10,W*0.16,W*0.54,W*0.61,W*0.68,W*0.75,W*0.82].map((bx,i) => (
                <Rect key={i} x={bx} y={[28,8,38,18,4,36,12,42][i]}
                  width={[22,16,12,20,15,18,14,16][i]}
                  height={[80,100,68,88,108,72,95,62][i]}
                  fill={PRIMARY} fillOpacity={0.08}/>
              ))}
            </Svg>
          </View>

          {/* handshake — left, fades in */}
          <Animated.View style={[styles.handshakeWrap, {opacity:fadeAll}]}>
            <Image
              source={require('./assets/handshake icon.png')}
              style={styles.handshakeImg}
              resizeMode="contain"
            />
          </Animated.View>

          {/* login icon — right, fades in */}
          <Animated.View style={[styles.rightIconWrap, {opacity:fadeAll}]}>
            <Image
              source={require('./assets/login icon.png')}
              style={styles.rightIcon}
              resizeMode="contain"
            />
          </Animated.View>

          {/* red wave */}
          <View style={styles.waveWrap}>
            <BottomWave/>
            <View style={styles.waveContent}>
              <Text style={styles.trustedText}>
                {'Trusted by Dealers. Built for Growth.'}
              </Text>
              <View style={styles.dotsRow}>
                <View style={[styles.dot, styles.dotActive]}/>
                <View style={styles.dot}/>
                <View style={styles.dot}/>
              </View>
            </View>
          </View>

        </View>
      </View>
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: WHITE,
    overflow: 'hidden',
  },

  /* background layers */
  mapWrap: {
    position: 'absolute',
    top: H * 0.12,
    left: W * 0.05,
  },
  floatIcon: {
    position: 'absolute',
    opacity: 0.14,
  },

  /* ── FLEX COLUMN — entire screen content ── */
  flexCol: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
  },

  /* 1. Logo row — sits naturally at top of the white screen */
  logoRow: {
    width: '100%',
    alignItems: 'center',
    paddingTop: H * 0.05,   /* breathing room from status bar */
    paddingBottom: 4,
  },
  logoImg: {
    width:  W * 0.65,
    height: W * 0.26,
  },

  /* 2. Center icon circle */
  iconCircleWrap: {
    marginTop: H * 0.02,
    alignItems: 'center',
    justifyContent: 'center',
    width:  W * 0.68,
    height: W * 0.52,
  },
  glowDot: {
    position: 'absolute',
    width:  W * 0.58,
    height: W * 0.58,
    borderRadius: W * 0.29,
    backgroundColor: PRIMARY,
    shadowColor: PRIMARY,
    shadowOffset: {width:0, height:0},
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 0,
  },
  circleBg: {
    position: 'absolute',
    width:  W * 0.60,
    height: W * 0.60,
    borderRadius: W * 0.30,
    backgroundColor: 'rgba(200,16,46,0.08)',
  },
  centerIcon: {
    width:  W * 0.64,
    height: W * 0.48,
    zIndex: 2,
  },

  /* 3. Tagline */
  taglineRow: {
    marginTop: H * 0.015,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  tagline: {
    color: '#1A1A1A',
    fontSize: 15.5,
    fontWeight: '700',
    letterSpacing: 0.1,
    textAlign: 'center',
    lineHeight: 23,
  },
  divider: {
    marginTop: 10,
    width: 44,
    height: 3,
    borderRadius: 2,
    backgroundColor: PRIMARY,
  },

  /* 4. Bottom block — fills remaining space */
  bottomBlock: {
    flex: 1,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: H * 0.01,
  },

  handshakeWrap: {
    position: 'absolute',
    left: 0,
    bottom: H * 0.17,
    zIndex: 2,
  },
  handshakeImg: {
    width:  W * 0.48,
    height: W * 0.52,
  },

  rightIconWrap: {
    position: 'absolute',
    right: 0,
    bottom: H * 0.17,
    zIndex: 2,
  },
  rightIcon: {
    width:  W * 0.48,
    height: W * 0.42,
  },

  /* wave */
  waveWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: H * 0.22,
  },
  waveContent: {
    position: 'absolute',
    bottom: 26,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  trustedText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    marginTop: 11,
    gap: 7,
    alignItems: 'center',
  },
  dot: {
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  dotActive: {
    width: 24, height: 8,
    borderRadius: 4,
    backgroundColor: WHITE,
  },
});

export default SplashScreen;
