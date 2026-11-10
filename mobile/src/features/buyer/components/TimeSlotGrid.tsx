import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../../../theme';

interface Props {
  slots: string[];
  selected: string;
  onSelect: (slot: string) => void;
}

export function TimeSlotGrid({ slots, selected, onSelect }: Props) {
  return (
    <View style={styles.grid}>
      {slots.map(s => {
        const active = s === selected;
        return (
          <Pressable key={s} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => onSelect(s)} style={[styles.slot, active && styles.active]}>
            <Text style={[styles.text, active && styles.textActive]}>{s}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 },
  slot: { width: '23%', paddingVertical: 10, alignItems: 'center', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  active: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  text: { fontSize: 11, color: colors.textMuted },
  textActive: { color: colors.primary, fontWeight: '700' },
});
