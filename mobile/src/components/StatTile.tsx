import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, typography } from '../theme';
import { Icon, IconName } from './Icon';

interface StatTileProps {
  icon: IconName;
  value: string;
  label: string;
  trend?: string;
  tint?: string;
  background?: string;
}

export function StatTile({ icon, value, label, trend, tint = colors.primary, background = colors.primarySoft }: StatTileProps) {
  return (
    <View style={styles.tile}>
      <View style={[styles.icon, { backgroundColor: background }]}>
        <Icon name={icon} size={16} color={tint} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={typography.tiny}>{label}</Text>
      {trend ? <Text style={styles.trend}>{trend}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, backgroundColor: colors.background, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 10 },
  icon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 6 },
  trend: { fontSize: 10, color: colors.success, fontWeight: '600' },
});
