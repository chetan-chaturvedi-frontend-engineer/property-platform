import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { colors, radius } from '../../../theme';
import { DayOption } from '../../../utils/dates';


interface Props {
  days: DayOption[];
  selected: number;
  onSelect: (index: number) => void;
}

export function DateStrip({ days, selected, onSelect }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {days.map((day, i) => {
        const active = i === selected;
        return (
          <Pressable key={day.iso} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => onSelect(i)} style={[styles.cell, active && styles.active]}>
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
