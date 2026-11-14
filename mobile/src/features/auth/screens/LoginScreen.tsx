import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, FormField, Header, Screen } from '../../../components';
import { RootScreenProps } from '../../../navigation/types';
import { colors, typography } from '../../../theme';
import { useLoginForm } from '../hooks/useLoginForm';

export function LoginScreen({ navigation, route }: RootScreenProps<'Login'>) {
  const f = useLoginForm(route.params?.identifier);

  async function onSubmit() {
    const outcome = await f.submit();
    if (outcome === 'signedIn') {
      navigation.popToTop();
    } else if (outcome === 'needsVerification') {
      navigation.navigate('VerifyOtp', { identifier: f.identifier.trim(), purpose: 'email_verification' });
    }
  }

  return (
    <Screen footer={<Button label={f.submitting ? 'Signing in…' : 'Sign In'} onPress={onSubmit} disabled={!f.canSubmit} />}>
      <Header title="Sign In" subtitle="Welcome back" />
      <View style={styles.form}>
        {route.params?.notice ? <Text style={styles.notice}>{route.params.notice}</Text> : null}
        <FormField
          label="Email or mobile number"
          icon="person-outline"
          value={f.identifier}
          onChangeText={f.setIdentifier}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="username"
          placeholder="you@example.com"
        />
        <FormField
          label="Password"
          icon="lock-closed-outline"
          value={f.password}
          onChangeText={f.setPassword}
          secureTextEntry
          autoCapitalize="none"
          textContentType="password"
          placeholder="Your password"
        />
        {f.error ? <Text style={styles.error}>{f.error}</Text> : null}
        <Text style={[typography.muted, styles.link]} onPress={() => navigation.navigate('Register')} accessibilityRole="link">
          New here? Create an account
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { paddingHorizontal: 16, paddingTop: 16, gap: 14 },
  error: { color: colors.danger, fontSize: 12 },
  notice: { color: colors.success, fontSize: 12 },
  link: { color: colors.primary, fontWeight: '600', textAlign: 'center', paddingVertical: 8 },
});
