import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, typography } from '../theme';
import { Icon } from './Icon';

interface StepperProps {
  label: string;
  value: number;
  display: string;
  step: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

/** −/+ control used instead of a slider (no extra native dependency). */
export function Stepper({ label, value, display, step, min, max, onChange }: StepperProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, Number(n.toFixed(4))));
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <Text style={typography.muted}>{label}</Text>
        <Text style={typography.h3}>{display}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Decrease ${label}`} style={styles.btn} onPress={() => onChange(clamp(value - step))}>
        <Icon name="remove" size={16} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Increase ${label}`} style={styles.btn} onPress={() => onChange(clamp(value + step))}>
        <Icon name="add" size={16} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  flex: { flex: 1 },
  btn: { width: 34, height: 34, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
});
