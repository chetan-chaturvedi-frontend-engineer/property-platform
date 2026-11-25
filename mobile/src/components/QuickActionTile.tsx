import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, typography } from '../theme';
import { Icon } from './Icon';
import type { IconName } from './Icon';

interface Props {
  icon: IconName;
  label: string;
  onPress: () => void;
  /** Unread count shown as a small badge. */
  badge?: number;
}

/** Rounded peach tile with a gold-brown icon: the category tiles of the buyer Home and the seller quick actions. */
export function QuickActionTile({ icon, label, onPress, badge }: Props) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.tile}>
      <View>
        <Icon name={icon} size={26} color={colors.primary} />
        {badge ? <View style={styles.badge}><Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text></View> : null}
      </View>
      <Text style={[typography.tiny, styles.label]} numberOfLines={2}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 4, backgroundColor: colors.primaryTint, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primarySoft },
  label: { color: colors.text, fontWeight: '600', textAlign: 'center' },
  badge: { position: 'absolute', top: -6, right: -10, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { color: colors.textInverse, fontSize: 9, fontWeight: '700' },
});
