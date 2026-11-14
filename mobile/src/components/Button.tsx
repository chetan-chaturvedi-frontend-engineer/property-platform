import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, radius } from '../theme';
import { Icon, IconName } from './Icon';

type Variant = 'primary' | 'outline' | 'soft' | 'danger';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: IconName;
  small?: boolean;
  /** Blocks presses and dims the button, e.g. while a request is in flight. */
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const variants: Record<Variant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.primary, fg: colors.textInverse, border: colors.primary },
  outline: { bg: colors.background, fg: colors.primary, border: colors.primary },
  soft: { bg: colors.primarySoft, fg: colors.primary, border: colors.primarySoft },
  danger: { bg: colors.background, fg: colors.danger, border: colors.danger },
};

export function Button({ label, onPress, variant = 'primary', icon, small, disabled, style }: ButtonProps) {
  const v = variants[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: v.bg, borderColor: v.border, paddingVertical: small ? 8 : 14, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}>
      {icon ? <Icon name={icon} size={small ? 14 : 16} color={v.fg} /> : null}
      <Text style={[small ? styles.textSmall : styles.text, { color: v.fg }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  text: { fontWeight: '600', fontSize: 14 },
  textSmall: { fontWeight: '600', fontSize: 12 },
  button: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
});
