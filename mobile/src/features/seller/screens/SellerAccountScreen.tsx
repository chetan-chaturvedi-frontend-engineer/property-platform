import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card, EmptyState, Header, Icon, IconButton, ListRow, Screen, SectionTitle, Tag } from '../../../components';
import type { IconName } from '../../../components';
import { useRootNavigation } from '../../../navigation/useRootNavigation';
import { colors, typography } from '../../../theme';
import { initialsOf } from '../../../utils/format';
import { useAuth } from '../../auth/AuthProvider';
import { useMySubscription, useSellerListings } from '../hooks/useSeller';

const rows: { icon: IconName; title: string; to?: 'Faq' | 'Settings' }[] = [
  { icon: 'help-circle-outline', title: 'Help & Support', to: 'Faq' },
  { icon: 'settings-outline', title: 'Settings', to: 'Settings' },
];

export function SellerAccountScreen() {
  const nav = useRootNavigation();
  const { status, user, signOut } = useAuth();
  const { data: subscription } = useMySubscription();
  const { data: listings } = useSellerListings();
  const used = listings?.length ?? 0;
  const limit = subscription?.propertyLimit;
  const fill = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  async function logOut() {
    await signOut();
    nav.reset({ index: 0, routes: [{ name: 'BuyerTabs' }] });
  }

  return (
    <Screen>
      <Header title="Account" subtitle="Manage your profile and plan" showBack={false} right={<IconButton name="settings-outline" accessibilityLabel="Settings" onPress={() => nav.navigate('Settings')} />} />
      {status === 'signedOut' ? <EmptyState title="Sign in to see your account" actionLabel="Sign In" onAction={() => nav.navigate('Login')} /> : null}
      {user ? (
        <Card style={styles.card}>
          <View style={styles.row}>
            <View style={styles.avatar}><Text style={styles.av}>{initialsOf(user.fullName)}</Text></View>
            <View style={styles.flex}>
              <Text style={typography.h3}>{user.fullName}</Text>
              <Text style={typography.muted}>{user.email}</Text>
              {user.phone ? <Text style={typography.muted}>{user.phone}</Text> : null}
            </View>
            {user.verified ? <Tag label="Verified" tone="success" /> : null}
          </View>
        </Card>
      ) : null}
      {user ? (
        <Card style={styles.card}>
          <View style={styles.row}>
            <Icon name="ribbon-outline" size={22} />
            <View style={styles.flex}>
              <Text style={typography.h3}>{subscription ? `${subscription.planTitle} plan` : 'No active plan'}</Text>
              <Text style={typography.tiny}>
                {subscription ? (limit === null ? 'Unlimited properties' : `You can list up to ${limit} properties`) : 'Choose a plan to list properties'}
              </Text>
            </View>
            <Tag label={subscription ? 'Change' : 'Choose'} tone="primary" />
          </View>
          {subscription && limit ? (
            <>
              <View style={styles.bar}><View style={[styles.fill, { width: `${fill}%` }]} /></View>
              <Text style={typography.tiny}>{used} / {limit} Properties Listed</Text>
            </>
          ) : null}
          <Text style={styles.link} onPress={() => nav.navigate('SellerRegistration')} accessibilityRole="link">
            {subscription ? 'View plans' : 'See plans'}
          </Text>
        </Card>
      ) : null}
      <SectionTitle title="More" />
      <Card style={[styles.card, styles.noPad]}>
        {rows.map(r => <ListRow key={r.title} icon={r.icon} title={r.title} onPress={() => r.to && nav.navigate(r.to)} />)}
        {user ? <ListRow icon="log-out-outline" title="Logout" danger onPress={logOut} /> : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  card: { marginHorizontal: 16, marginBottom: 12, gap: 8 },
  noPad: { padding: 0 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  av: { color: colors.textInverse, fontWeight: '700' },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.primarySoft },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  link: { color: colors.primary, fontWeight: '600' },
});
