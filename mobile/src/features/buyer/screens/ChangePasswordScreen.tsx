import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, FormField, Header, Screen } from '../../../components';
import { RootScreenProps } from '../../../navigation/types';
import { colors } from '../../../theme';
import { useChangePassword } from '../hooks/useChangePassword';

export function ChangePasswordScreen({ navigation }: RootScreenProps<'ChangePassword'>) {
  const f = useChangePassword();

  async function onSubmit() {
    if (await f.submit()) {
      navigation.reset({ index: 1, routes: [{ name: 'BuyerTabs' }, { name: 'Login', params: { notice: 'Password changed. Sign in with your new password.' } }] });
    }
  }

  return (
    <Screen footer={<Button label={f.submitting ? 'Saving…' : 'Change Password'} onPress={onSubmit} disabled={!f.canSubmit} />}>
      <Header title="Change Password" subtitle="You will be signed out on all devices" />
      <View style={styles.form}>
        <FormField label="Current password" icon="lock-closed-outline" value={f.currentPassword} onChangeText={f.setCurrentPassword} secureTextEntry autoCapitalize="none" textContentType="password" />
        <FormField label="New password" icon="key-outline" value={f.password} onChangeText={f.setPassword} error={f.passwordError ?? undefined} secureTextEntry autoCapitalize="none" textContentType="newPassword" placeholder="8+ chars, uppercase, digit, symbol" />
        {f.error ? <Text style={styles.error}>{f.error}</Text> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { paddingHorizontal: 16, paddingTop: 16, gap: 14 },
  error: { color: colors.danger, fontSize: 12 },
});
