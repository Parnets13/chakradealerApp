import React from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import BrandLogo from './BrandLogo';
import {colors} from './theme';

function SplashScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
      <View style={styles.center}>
        <BrandLogo />
        <Text style={styles.title}>Dealer APP</Text>
        <Text style={styles.subtitle}>Orders, stock, dispatch and ledger in one app</Text>
        <View style={styles.loader}>
          <ActivityIndicator color={colors.orange} size="small" />
          <Text style={styles.loadingText}>Loading secure workspace...</Text>
        </View>
      </View>
      <Text style={styles.footer}>Sri Chakra Industries</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  glowTop: {
    position: 'absolute',
    top: -120,
    right: -110,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.red,
    opacity: 0.18,
  },
  glowBottom: {
    position: 'absolute',
    bottom: -100,
    left: -90,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.orange,
    opacity: 0.16,
  },
  center: {
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  title: {
    color: '#161515ff',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 26,
  },
  subtitle: {
    color: '#B8C7C5',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
  loader: {
    marginTop: 28,
    minHeight: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    color: '#DDEBE9',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 28,
    color: '#78908D',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default SplashScreen;
