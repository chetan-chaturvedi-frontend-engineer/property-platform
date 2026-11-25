import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, typography } from '../../../theme';
import { initialsOf } from '../../../utils/format';

interface Props {
  builders: string[];
  onSelect: (name: string) => void;
}

/** Horizontal row of builder tiles (monogram + name); tapping one searches for that builder. */
export function TopBuilders({ builders, onSelect }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {builders.map(name => (
        <Pressable key={name} accessibilityRole="button" accessibilityLabel={`Properties by ${name}`} onPress={() => onSelect(name)} style={styles.tile}>
          <View style={styles.mark}><Text style={styles.markText}>{initialsOf(name)}</Text></View>
          <Text style={[typography.h3, styles.name]} numberOfLines={2}>{name}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 12, paddingHorizontal: 16 },
  tile: { flexDirection: 'row', alignItems: 'center', gap: 10, width: 170, padding: 12, backgroundColor: colors.background, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  mark: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  markText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  name: { flex: 1, fontSize: 13 },
});
