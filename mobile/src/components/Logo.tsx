import React from 'react';
import { Image, StyleSheet } from 'react-native';

interface LogoProps {
  size?: number;
}

/** The Dwellery mark (gold roof over a "D" on navy), shown as a rounded tile. */
export function Logo({ size = 40 }: LogoProps) {
  return (
    <Image
      source={require('../../assets/logo/dwellery-mark.png')}
      accessibilityLabel="Dwellery logo"
      style={[styles.logo, { width: size, height: size, borderRadius: size * 0.24 }]}
    />
  );
}

const styles = StyleSheet.create({
  logo: { backgroundColor: 'transparent' },
});
