import React from 'react';
import {Image, StyleSheet, View} from 'react-native';

function BrandLogo({compact = false}) {
  return (
    <View style={[styles.logoBox, compact && styles.logoBoxCompact]}>
      <Image
        source={require('./assets/sri-chakra-logo.png')}
        style={[styles.logo, compact && styles.logoCompact]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  logoBox: {
    width: 230,
    height: 92,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  logoBoxCompact: {
    width: 148,
    height: 52,
    borderRadius: 16,
    paddingHorizontal: 10,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  logoCompact: {
    width: '100%',
    height: '100%',
  },
});

export default BrandLogo;
