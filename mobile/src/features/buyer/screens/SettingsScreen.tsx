import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card, Header, ListRow, Screen, Tag } from '../../../components';
import type { IconName } from '../../../components';
import { authService } from '../../../services/authService';
import { useRootNavigation } from '../../../navigation/useRootNavigation';
import { colors, typography } from '../../../theme';

interface Row { icon: IconName; title: string; sub: string; right?: string }
const account: Row[] = [
  { icon: 'person-outline', title: 'Personal Information', sub: 'Update your personal details' },
  { icon: 'lock-closed-outline', title: 'Change Password', sub: 'Update your password regularly' },
  { icon: 'call-outline', title: 'Mobile Number', sub: 'Update your registered mobile number' },
  { icon: 'mail-outline', title: 'Email Address', sub: 'Update your registered email address' },
];
const prefs: Row[] = [
  { icon: 'notifications-outline', title: 'Notifications', sub: 'Manage what you want to receive', right: 'Enabled' },
  { icon: 'globe-outline', title: 'Language', sub: 'Choose your preferred language', right: 'English' },
  { icon: 'color-palette-outline', title: 'Theme', sub: 'Choose your app theme', right: 'Light' },
  { icon: 'location-outline', title: 'Location Preferences', sub: 'Manage location access and suggestions' },
];
const more: Row[] = [
  { icon: 'shield-outline', title: 'Privacy & Security', sub: 'Manage your data and privacy' },
  { icon: 'document-text-outline', title: 'Terms & Conditions', sub: 'Read our terms and conditions' },
  { icon: 'information-circle-outline', title: 'About Property', sub: 'App version 2.3.1', right: 'Latest Version' },
];

const legalTarget: Record<string, 'privacy' | 'terms'> = {
  'Privacy & Security': 'privacy',
  'Terms & Conditions': 'terms',
};

export function SettingsScreen() {
  const nav = useRootNavigation();

  async function logOut() {
    await authService.signOut();
    nav.reset({ index: 0, routes: [{ name: 'BuyerTabs' }] });
  }

  const group = (title: string, rows: Row[]) => (
    <>
      <Text style={styles.group}>{title}</Text>
      <Card style={styles.card}>
        {rows.map(r => (
          <ListRow
            key={r.title}
            icon={r.icon}
            title={r.title}
            subtitle={r.sub}
            right={r.right ? <Tag label={r.right} tone="success" /> : undefined}
            onPress={legalTarget[r.title] ? () => nav.navigate('Legal', { doc: legalTarget[r.title] }) : undefined}
          />
        ))}
      </Card>
    </>
  );

  return (
    <Screen>
      <Header title="Settings" subtitle="Manage your app preferences" />
      <View style={styles.banner}>
        <Text style={typography.h3}>Secure. Simple. Personal.</Text>
        <Text style={typography.muted}>We care about your privacy and provide a better experience.</Text>
      </View>
      {group('Account Settings', account)}
      {group('Preferences', prefs)}
      {group('More', more)}
      <Card style={styles.card}>
        <ListRow icon="log-out-outline" title="Log Out" subtitle="Sign out from your account" danger onPress={logOut} />
        <ListRow
          icon="trash-outline"
          title="Delete Account"
          subtitle="Permanently delete your account and data"
          danger
          onPress={() => nav.navigate('DeleteAccount')}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { marginHorizontal: 16, padding: 16, borderRadius: 16, backgroundColor: colors.primarySoft },
  group: { ...typography.h3, paddingHorizontal: 16, marginTop: 16, marginBottom: 8 },
  card: { marginHorizontal: 16, padding: 0 },
});
