import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, FormField, Header, Screen } from '../../../components';
import { RootScreenProps } from '../../../navigation/types';
import { colors, typography } from '../../../theme';
import { useResetPassword } from '../hooks/useResetPassword';

export function ResetPasswordScreen({ navigation, route }: RootScreenProps<'ResetPassword'>) {
  const { identifier } = route.params;
  const f = useResetPassword(identifier);

  async function onSubmit() {
    if (await f.submit()) {
      navigation.replace('Login', { identifier, notice: 'Password reset. Sign in with your new password.' });
    }
  }

  return (
    <Screen footer={<Button label={f.submitting ? 'Resetting…' : 'Reset Password'} onPress={onSubmit} disabled={!f.canSubmit} />}>
      <Header title="Reset Password" subtitle={`If ${identifier} has an account, a code was sent`} />
      <View style={styles.form}>
        <FormField label="Reset code" icon="keypad-outline" value={f.otp} onChangeText={f.setOtp} keyboardType="number-pad" maxLength={10} textContentType="oneTimeCode" placeholder="6-digit code" />
        <FormField label="New password" icon="lock-closed-outline" value={f.password} onChangeText={f.setPassword} error={f.passwordError ?? undefined} secureTextEntry autoCapitalize="none" textContentType="newPassword" placeholder="8+ chars, uppercase, digit, symbol" />
        {f.error ? <Text style={styles.error}>{f.error}</Text> : null}
        <Text style={[typography.muted, styles.link]} onPress={() => navigation.replace('ForgotPassword', { identifier })} accessibilityRole="link">
          Did not get a code? Send again
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { paddingHorizontal: 16, paddingTop: 16, gap: 14 },
  error: { color: colors.danger, fontSize: 12 },
  link: { color: colors.primary, fontWeight: '600', textAlign: 'center', paddingVertical: 8 },
});
