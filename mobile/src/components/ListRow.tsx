import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '../theme';
import { Icon, IconName } from './Icon';

interface ListRowProps {
  icon: IconName;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  tint?: string;
  tintBackground?: string;
  danger?: boolean;
  onPress?: () => void;
}

/** Icon tile + title/subtitle + optional trailing content + chevron (profile & settings lists). */
export function ListRow({
  icon,
  title,
  subtitle,
  right,
  tint = colors.primary,
  tintBackground = colors.primarySoft,
  danger,
  onPress,
}: ListRowProps) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>
      <View style={[styles.tile, { backgroundColor: danger ? colors.dangerSoft : tintBackground }]}>
        <Icon name={icon} size={18} color={danger ? colors.danger : tint} />
      </View>
      <View style={styles.flex}>
        <Text style={[typography.h3, danger && { color: colors.danger }]}>{title}</Text>
        {subtitle ? <Text style={typography.muted}>{subtitle}</Text> : null}
      </View>
      {right}
      <Icon name="chevron-forward" size={16} color={colors.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  tile: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
});
