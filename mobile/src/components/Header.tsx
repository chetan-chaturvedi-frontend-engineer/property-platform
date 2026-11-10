import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { typography } from '../theme';
import { IconButton } from './IconButton';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  right?: React.ReactNode;
}

export function Header({ title, subtitle, showBack = true, right }: HeaderProps) {
  const navigation = useNavigation();
  return (
    <View style={styles.row}>
      {showBack && navigation.canGoBack() ? (
        <IconButton name="chevron-back" accessibilityLabel="Go back" onPress={navigation.goBack} />
      ) : null}
      <View style={styles.flex}>
        <Text accessibilityRole="header" style={typography.h2} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={typography.muted} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  flex: { flex: 1 },
});
