import React from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { Card, Header, ListRow, Screen, Tag } from '../../../components';
import type { IconName } from '../../../components';
import { useRootNavigation } from '../../../navigation/useRootNavigation';
import { colors, typography } from '../../../theme';
import { useAuth } from '../../auth/AuthProvider';
import { useSettings } from '../hooks/useSettings';

const { version } = require('../../../../package.json') as { version: string };

interface Row { icon: IconName; title: string; sub: string; right?: string }
const more: Row[] = [
  { icon: 'shield-outline', title: 'Privacy & Security', sub: 'Manage your data and privacy' },
  { icon: 'document-text-outline', title: 'Terms & Conditions', sub: 'Read our terms and conditions' },
  { icon: 'help-circle-outline', title: 'Support & Help', sub: 'FAQs and contact options' },
  { icon: 'information-circle-outline', title: 'About Property', sub: `App version ${version}` },
];

const legalTarget: Record<string, 'privacy' | 'terms'> = {
  'Privacy & Security': 'privacy',
  'Terms & Conditions': 'terms',
};

export function SettingsScreen() {
  const nav = useRootNavigation();

  const { status, user, signOut } = useAuth();
  const { settings, update, error, signedIn } = useSettings();

  async function logOut() {
    await signOut();
    nav.reset({ index: 0, routes: [{ name: 'BuyerTabs' }] });
  }

  /** Saving settings needs an account; guests are sent to sign in. */
  function needAccount(action: () => void) {
    if (signedIn) {
      action();
    } else if (status === 'signedOut') {
      nav.navigate('Login');
    }
  }

  const choose = (title: string, options: [string, () => void][]) =>
    Alert.alert(title, undefined, [...options.map(([label, run]) => ({ text: label, onPress: run })), { text: 'Cancel', style: 'cancel' as const }]);

  const account: { icon: IconName; title: string; sub: string; onPress?: () => void }[] = [
    { icon: 'person-outline', title: 'Personal Information', sub: user?.fullName ?? 'Update your personal details', onPress: () => needAccount(() => nav.navigate('EditProfile')) },
    { icon: 'lock-closed-outline', title: 'Change Password', sub: 'Update your password regularly', onPress: () => needAccount(() => nav.navigate('ChangePassword')) },
    { icon: 'call-outline', title: 'Mobile Number', sub: user?.phone || 'Your registered mobile number' },
    { icon: 'mail-outline', title: 'Email Address', sub: user?.email ?? 'Your registered email address' },
  ];

  const prefs: { icon: IconName; title: string; sub: string; right?: React.ReactNode; onPress?: () => void }[] = [
    {
      icon: 'notifications-outline',
      title: 'Notifications',
      sub: 'Manage what you want to receive',
      right: <Switch value={settings.notificationsEnabled} onValueChange={v => needAccount(() => update({ notificationsEnabled: v }))} accessibilityLabel="Notifications" />,
    },
    {
      icon: 'globe-outline',
      title: 'Language',
      sub: 'Choose your preferred language',
      right: <Tag label={settings.language === 'hi' ? 'हिन्दी' : 'English'} tone="success" />,
      onPress: () => needAccount(() => choose('Language', [['English', () => update({ language: 'en' })], ['हिन्दी', () => update({ language: 'hi' })]])),
    },
    {
      icon: 'color-palette-outline',
      title: 'Theme',
      sub: 'Choose your app theme',
      right: <Tag label={settings.theme[0].toUpperCase() + settings.theme.slice(1)} tone="success" />,
      onPress: () => needAccount(() => choose('Theme', [['Light', () => update({ theme: 'light' })], ['Dark', () => update({ theme: 'dark' })], ['System', () => update({ theme: 'system' })]])),
    },
    {
      icon: 'location-outline',
      title: 'Location Preferences',
      sub: settings.location ? `Preferred city: ${settings.location}` : 'No preferred city saved',
    },
  ];

  const group = (title: string, rows: { icon: IconName; title: string; sub: string; right?: React.ReactNode; onPress?: () => void }[]) => (
    <>
      <Text style={styles.group}>{title}</Text>
      <Card style={styles.card}>
        {rows.map(r => (
          <ListRow
            key={r.title}
            icon={r.icon}
            title={r.title}
            subtitle={r.sub}
            right={r.right}
            onPress={r.onPress ?? (legalTarget[r.title] ? () => nav.navigate('Legal', { doc: legalTarget[r.title] }) : r.title === 'Support & Help' ? () => nav.navigate('Faq') : undefined)}
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
      {error ? <Text style={styles.error}>{error}</Text> : null}
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
  error: { color: colors.danger, fontSize: 12, paddingHorizontal: 16, paddingTop: 8 },
});
