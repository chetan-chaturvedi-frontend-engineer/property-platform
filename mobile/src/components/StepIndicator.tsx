import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

interface Props {
  total: number;
  current: number; // 1-based
}

export function StepIndicator({ total, current }: Props) {
  return (
    <View style={styles.row} accessibilityLabel={`Step ${current} of ${total}`}>
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <React.Fragment key={n}>
            <View style={[styles.dot, (done || active) && styles.on]}>
              <Text style={[styles.num, (done || active) && { color: colors.textInverse }]}>{done ? '✓' : n}</Text>
            </View>
            {n < total ? <View style={[styles.line, done && styles.lineOn]} /> : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  on: { backgroundColor: colors.primary, borderColor: colors.primary },
  num: { fontSize: 10, fontWeight: '700', color: colors.textMuted },
  line: { flex: 1, height: 2, backgroundColor: colors.border },
  lineOn: { backgroundColor: colors.primary },
});
