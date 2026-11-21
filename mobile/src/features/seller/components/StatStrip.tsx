import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../../components';
import type { IconName } from '../../../components';
import { colors, radius, shadows, typography } from '../../../theme';

export interface StatItem {
  icon: IconName;
  value: string;
  label: string;
}

/** A white card floating over the dark header with the headline numbers side by side. */
export function StatStrip({ stats }: { stats: StatItem[] }) {
  return (
    <View style={styles.card}>
      {stats.map((s, i) => (
        <View key={s.label} style={[styles.item, i > 0 && styles.divider]} accessibilityLabel={`${s.value} ${s.label}`}>
          <Icon name={s.icon} size={18} color={colors.primary} />
          <Text style={styles.value}>{s.value}</Text>
          <Text style={typography.tiny} numberOfLines={1}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', marginHorizontal: 16, marginTop: -36, backgroundColor: colors.background, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingVertical: 14, ...shadows.card },
  item: { flex: 1, alignItems: 'center', gap: 4 },
  divider: { borderLeftWidth: 1, borderLeftColor: colors.border },
  value: { ...typography.h2, fontSize: 20 },
});
