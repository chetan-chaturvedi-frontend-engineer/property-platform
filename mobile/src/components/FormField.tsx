import React from 'react';
import { StyleSheet, Text, TextInputProps, View } from 'react-native';
import { colors, typography } from '../theme';
import { IconName } from './Icon';
import { TextField } from './TextField';

interface FormFieldProps extends TextInputProps {
  label: string;
  icon?: IconName;
  /** Validation message shown under the input. */
  error?: string;
}

/** Labelled input with an inline error, used by every form. */
export function FormField({ label, icon, error, ...inputProps }: FormFieldProps) {
  return (
    <View style={styles.wrap}>
      <Text style={typography.muted}>{label}</Text>
      <TextField icon={icon} accessibilityLabel={label} {...inputProps} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  error: { color: colors.danger, fontSize: 11 },
});
