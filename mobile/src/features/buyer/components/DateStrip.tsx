import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { colors, radius } from '../../../theme';

const DAYS = [
  { dow: 'Today', d: '22', m: 'May' },
  { dow: 'Thu', d: '23', m: 'May' },
  { dow: 'Fri', d: '24', m: 'May' },
  { dow: 'Sat', d: '25', m: 'May' },
  { dow: 'Sun', d: '26', m: 'May' },
  { dow: 'Mon', d: '27', m: 'May' },
  { dow: 'Tue', d: '28', m: 'May' },
];

interface Props {
  selected: number;
  onSelect: (index: number) => void;
}

export function DateStrip({ selected, onSelect }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {DAYS.map((day, i) => {
        const active = i === selected;
        return (
          <Pressable key={day.d} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => onSelect(i)} style={[styles.cell, active && styles.active]}>
            <Text style={[styles.dow, active && styles.inv]}>{day.dow}</Text>
            <Text style={[styles.day, active && styles.inv]}>{day.d}</Text>
            <Text style={[styles.dow, active && styles.inv]}>{day.m}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingHorizontal: 16 },
  cell: { width: 52, paddingVertical: 8, alignItems: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  active: { backgroundColor: colors.primary, borderColor: colors.primary },
  dow: { fontSize: 10, color: colors.textMuted },
  day: { fontSize: 16, fontWeight: '700', color: colors.text },
  inv: { color: colors.textInverse },
});
