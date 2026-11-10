import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export type TagTone = 'primary' | 'success' | 'warning' | 'danger' | 'orange';

const tones: Record<TagTone, { bg: string; fg: string }> = {
  primary: { bg: colors.primarySoft, fg: colors.primary },
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warningText },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  orange: { bg: colors.orangeSoft, fg: colors.orange },
};

export function Tag({ label, tone = 'primary' }: { label: string; tone?: TagTone }) {
  const t = tones[tone];
  return (
    <View style={[styles.tag, { backgroundColor: t.bg }]}>
      <Text style={[styles.text, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, alignSelf: 'flex-start' },
  text: { fontSize: 10, fontWeight: '600' },
});
