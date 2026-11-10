import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radius } from '../theme';
import { Icon, IconName } from './Icon';

interface PropertyPhotoProps {
  icon?: IconName;
  label?: string;
  tone?: number;
  style?: StyleProp<ViewStyle>;
}

/** Placeholder for property photography. Replace with <Image/> once the API returns image URLs. */
export function PropertyPhoto({ icon = 'business', label, tone = 0, style }: PropertyPhotoProps) {
  const bg = colors.photoTones[tone % colors.photoTones.length];
  return (
    <View style={[styles.box, { backgroundColor: bg }, style]} accessibilityRole="image">
      <Icon name={icon} size={36} color={colors.overlayLight} />
      {label ? (
        <View style={styles.label}>
          <Text style={styles.labelText}>{label}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: radius.md },
  label: { position: 'absolute', left: 8, bottom: 8, backgroundColor: colors.overlay, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  labelText: { color: colors.textInverse, fontSize: 10, fontWeight: '600' },
});
