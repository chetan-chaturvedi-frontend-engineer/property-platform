import React from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { colors, radius } from '../theme';
import { Icon, IconName } from './Icon';

interface TextFieldProps extends TextInputProps {
  icon?: IconName;
}

export function TextField({ icon, style, ...props }: TextFieldProps) {
  return (
    <View style={styles.box}>
      {icon ? <Icon name={icon} size={16} color={colors.textFaint} /> : null}
      <TextInput placeholderTextColor={colors.textFaint} style={[styles.input, style]} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: colors.background },
  input: { flex: 1, fontSize: 13, color: colors.text, paddingVertical: 8 },
});
