import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, FormField, Header, Screen } from '../../../components';
import { RootScreenProps } from '../../../navigation/types';
import { colors, typography } from '../../../theme';
import { useRegisterForm } from '../hooks/useRegisterForm';

export function RegisterScreen({ navigation }: RootScreenProps<'Register'>) {
  const f = useRegisterForm();

  async function onSubmit() {
    const email = await f.submit();
    if (email) {
      navigation.replace('VerifyOtp', { identifier: email, purpose: 'email_verification' });
    }
  }

  return (
    <Screen footer={<Button label={f.submitting ? 'Creating account…' : 'Create Account'} onPress={onSubmit} disabled={f.submitting} />}>
      <Header title="Create Account" subtitle="Find and book your next home" />
      <View style={styles.form}>
        <FormField label="Full name" icon="person-outline" value={f.fullName} onChangeText={f.setFullName} error={f.errors.fullName} autoCapitalize="words" textContentType="name" />
        <FormField label="Email" icon="mail-outline" value={f.email} onChangeText={f.setEmail} error={f.errors.email} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" />
        <FormField label="Mobile number" icon="call-outline" value={f.phone} onChangeText={f.setPhone} error={f.errors.phone} keyboardType="phone-pad" textContentType="telephoneNumber" placeholder="10-digit number" />
        <FormField label="Password" icon="lock-closed-outline" value={f.password} onChangeText={f.setPassword} error={f.errors.password} secureTextEntry autoCapitalize="none" textContentType="newPassword" placeholder="8+ chars, uppercase, digit, symbol" />
        {f.errors.form ? <Text style={styles.error}>{f.errors.form}</Text> : null}
        <Text style={[typography.muted, styles.link]} onPress={() => navigation.replace('Login', {})} accessibilityRole="link">
          Already have an account? Sign in
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
