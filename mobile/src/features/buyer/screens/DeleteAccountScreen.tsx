import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, Header, Icon, Screen, TextField } from '../../../components';
import { useRootNavigation } from '../../../navigation/useRootNavigation';
import { colors, typography } from '../../../theme';
import { useDeleteAccount } from '../hooks/useDeleteAccount';

export function DeleteAccountScreen() {
  const nav = useRootNavigation();
  const f = useDeleteAccount(() => nav.reset({ index: 0, routes: [{ name: 'BuyerTabs' }] }));
  return (
    <Screen footer={<Button variant="danger" label={f.busy ? 'Deleting…' : 'Permanently Delete My Account'} onPress={f.deleteAccount} style={!f.canDelete && styles.disabled} />}>
      <Header title="Delete Account" />
      <Card style={styles.card}>
        <View style={styles.row}><Icon name="warning-outline" size={22} color={colors.danger} /><Text style={typography.h3}>This cannot be undone</Text></View>
        <Text style={typography.muted}>
          Deleting your account permanently removes your profile, shortlist, bookings, messages and any property listings. Some records may be retained where the law requires.
        </Text>
        <Text style={typography.body}>Type DELETE to confirm.</Text>
        <TextField placeholder="DELETE" autoCapitalize="characters" value={f.confirmText} onChangeText={f.setConfirmText} accessibilityLabel="Type DELETE to confirm" />
        {f.error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{f.error}</Text> : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, gap: 10 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  error: { color: colors.danger, fontSize: 12 },
  disabled: { opacity: 0.4 },
});
