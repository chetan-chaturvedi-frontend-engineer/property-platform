import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, FormField, Header, Screen } from '../../../components';
import { RootScreenProps } from '../../../navigation/types';
import { colors, typography } from '../../../theme';
import { useVerifyOtp } from '../hooks/useVerifyOtp';

export function VerifyOtpScreen({ navigation, route }: RootScreenProps<'VerifyOtp'>) {
  const { identifier, purpose } = route.params;
  const f = useVerifyOtp(identifier, purpose);

  async function onVerify() {
    if (await f.verify()) {
      navigation.replace('Login', { identifier, notice: 'Account verified. Sign in to continue.' });
    }
  }

  return (
    <Screen footer={<Button label={f.submitting ? 'Verifying…' : 'Verify'} onPress={onVerify} disabled={!f.canSubmit} />}>
      <Header title="Verify Account" subtitle={`Enter the code sent to ${identifier}`} />
      <View style={styles.form}>
        <FormField
          label="Verification code"
          icon="keypad-outline"
          value={f.otp}
          onChangeText={f.setOtp}
          keyboardType="number-pad"
          maxLength={10}
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          placeholder="6-digit code"
        />
        {f.error ? <Text style={styles.error}>{f.error}</Text> : null}
        {f.info ? <Text style={styles.info}>{f.info}</Text> : null}
        <Text
          style={[typography.muted, styles.link, f.cooldown > 0 && styles.disabled]}
          onPress={f.resend}
          accessibilityRole="button"
          accessibilityState={{ disabled: f.cooldown > 0 }}>
          {f.cooldown > 0 ? `Resend code in ${f.cooldown}s` : 'Resend code'}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { paddingHorizontal: 16, paddingTop: 16, gap: 14 },
  error: { color: colors.danger, fontSize: 12 },
  info: { color: colors.success, fontSize: 12 },
  link: { color: colors.primary, fontWeight: '600', textAlign: 'center', paddingVertical: 8 },
  disabled: { color: colors.textFaint },
});
