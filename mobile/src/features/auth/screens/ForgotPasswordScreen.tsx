import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, FormField, Header, Screen } from '../../../components';
import { RootScreenProps } from '../../../navigation/types';
import { colors } from '../../../theme';
import { useForgotPassword } from '../hooks/useForgotPassword';

export function ForgotPasswordScreen({ navigation, route }: RootScreenProps<'ForgotPassword'>) {
  const f = useForgotPassword(route.params?.identifier);

  async function onSubmit() {
    if (await f.submit()) {
      navigation.replace('ResetPassword', { identifier: f.identifier.trim() });
    }
  }

  return (
    <Screen footer={<Button label={f.submitting ? 'Sending…' : 'Send Code'} onPress={onSubmit} disabled={!f.canSubmit} />}>
      <Header title="Forgot Password" subtitle="We will send a code to reset it" />
      <View style={styles.form}>
        <FormField
          label="Email or mobile number"
          icon="person-outline"
          value={f.identifier}
          onChangeText={f.setIdentifier}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="you@example.com"
        />
        {f.error ? <Text style={styles.error}>{f.error}</Text> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { paddingHorizontal: 16, paddingTop: 16, gap: 14 },
  error: { color: colors.danger, fontSize: 12 },
});
