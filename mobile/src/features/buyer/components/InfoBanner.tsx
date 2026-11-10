import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon, IconName } from '../../../components';
import { colors, typography } from '../../../theme';

interface Props {
  icon: IconName;
  title: string;
  body: string;
  tone?: 'primary' | 'success';
}

export function InfoBanner({ icon, title, body, tone = 'primary' }: Props) {
  const bg = tone === 'success' ? colors.successSoft : colors.primaryTint;
  const fg = tone === 'success' ? colors.success : colors.primary;
  return (
    <View style={[styles.box, { backgroundColor: bg }]}>
      <Icon name={icon} size={22} color={fg} />
      <View style={styles.flex}>
        <Text style={typography.h3}>{title}</Text>
        <Text style={typography.muted}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 14, padding: 12, borderRadius: 12 },
  flex: { flex: 1 },
});
