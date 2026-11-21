import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, FormField, Header, Screen } from '../../../components';
import { RootScreenProps } from '../../../navigation/types';
import { colors, typography } from '../../../theme';
import { useEditProfile } from '../hooks/useEditProfile';

export function EditProfileScreen({ navigation }: RootScreenProps<'EditProfile'>) {
  const f = useEditProfile();

  async function onSubmit() {
    if (await f.submit()) {
      navigation.goBack();
    }
  }

  return (
    <Screen footer={<Button label={f.submitting ? 'Saving…' : 'Save'} onPress={onSubmit} disabled={!f.canSubmit} />}>
      <Header title="Personal Information" subtitle="Update your details" />
      <View style={styles.form}>
        <FormField label="Full name" icon="person-outline" value={f.fullName} onChangeText={f.setFullName} autoCapitalize="words" textContentType="name" />
        <Text style={typography.muted}>Email: {f.user?.email}</Text>
        {f.user?.phone ? <Text style={typography.muted}>Mobile: {f.user.phone}</Text> : null}
        <Text style={typography.tiny}>Changing your email or mobile number needs re-verification and is not available in the app yet.</Text>
        {f.error ? <Text style={styles.error}>{f.error}</Text> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { paddingHorizontal: 16, paddingTop: 16, gap: 14 },
  error: { color: colors.danger, fontSize: 12 },
});
