import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, Header, Icon, IconButton, ListRow, Screen, SectionTitle, Tag } from '../../../components';
import type { IconName } from '../../../components';
import { useRootNavigation } from '../../../navigation/useRootNavigation';
import { RootStackParamList } from '../../../navigation/types';
import { colors, radius, typography } from '../../../theme';
import { initialsOf } from '../../../utils/format';
import { useAuth } from '../../auth/AuthProvider';

const activity: { icon: IconName; n: string; l: string }[] = [
  { icon: 'heart-outline', n: '12', l: 'Shortlisted' },
  { icon: 'calendar-outline', n: '3', l: 'Scheduled' },
  { icon: 'document-text-outline', n: '2', l: 'Bookings' },
  { icon: 'eye-outline', n: '18', l: 'Viewed' },
  { icon: 'git-compare-outline', n: '4', l: 'Compared' },
];

const items: { icon: IconName; title: string; sub: string; badge?: string; to?: keyof RootStackParamList }[] = [
  { icon: 'heart-outline', title: 'My Shortlist', sub: 'View and manage your saved properties', badge: '12 Properties' },
  { icon: 'calendar-outline', title: 'Scheduled Visits', sub: 'Manage your upcoming site visits', badge: '3 Visits', to: 'Bookings' },
  { icon: 'eye-outline', title: 'Recently Viewed', sub: 'Properties you recently explored', badge: '18 Properties', to: 'RecentlyViewed' },
  { icon: 'git-compare-outline', title: 'Compare Properties', sub: 'View and manage your comparisons', badge: '4', to: 'Compare' },
  { icon: 'document-text-outline', title: 'My Bookings', sub: 'View your booking history and details', badge: '2 Bookings', to: 'Bookings' },
  { icon: 'calculator-outline', title: 'Loan & EMI Calculator', sub: 'Check loan eligibility and EMI plans', to: 'EmiCalculator' },
  { icon: 'headset-outline', title: 'Support & Help', sub: 'Get help or raise a query' },
];

export function ProfileScreen() {
  const nav = useRootNavigation();
  const { status, user, signOut } = useAuth();
  return (
    <Screen>
      <Header
        title="My Profile"
        subtitle="Manage your account and activity"
        showBack={false}
        right={
          <View style={styles.row}>
            <IconButton name="notifications-outline" badge={3} accessibilityLabel="Notifications" onPress={() => nav.navigate('Notifications')} />
            <IconButton name="settings-outline" accessibilityLabel="Settings" onPress={() => nav.navigate('Settings')} />
          </View>
        }
      />
      {user ? (
        <Card style={styles.profile}>
          <View style={styles.row}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{initialsOf(user.fullName)}</Text></View>
            <View style={styles.flex}>
              <View style={styles.row}><Text style={typography.h2}>{user.fullName}</Text>{user.verified ? <Tag label="Verified" tone="success" /> : null}</View>
              {user.phone ? <Text style={typography.muted}>{user.phone}</Text> : null}
              <Text style={typography.muted}>{user.email}</Text>
            </View>
          </View>
        </Card>
      ) : (
        <Card style={styles.profile}>
          <Text style={typography.h3}>{status === 'loading' ? 'Loading your account…' : 'You are browsing as a guest'}</Text>
          <Text style={typography.muted}>Sign in to book site visits and list properties.</Text>
          {status === 'signedOut' ? (
            <View style={[styles.row, styles.authRow]}>
              <Button small label="Sign In" onPress={() => nav.navigate('Login')} style={styles.flex} />
              <Button small variant="outline" label="Create Account" onPress={() => nav.navigate('Register')} style={styles.flex} />
            </View>
          ) : null}
        </Card>
      )}

      <SectionTitle title="My Activity" action="View All" />
      <View style={[styles.row, styles.pad]}>
        {activity.map(a => (
          <View key={a.l} style={styles.act}>
            <Icon name={a.icon} size={16} />
            <Text style={typography.h3}>{a.n}</Text>
            <Text style={typography.tiny}>{a.l}</Text>
          </View>
        ))}
      </View>

      <Card style={styles.list}>
        {items.map(i => (
          <ListRow
            key={i.title}
            icon={i.icon}
            title={i.title}
            subtitle={i.sub}
            right={i.badge ? <Tag label={i.badge} /> : undefined}
            onPress={() => i.to && (nav.navigate as (r: string) => void)(i.to)}
          />
        ))}
      </Card>

      <Card style={[styles.list, styles.sell]}>
        <View style={styles.flex}>
          <Text style={typography.h3}>Looking to sell your property?</Text>
          <Text style={typography.muted}>List your property and reach thousands of genuine buyers.</Text>
        </View>
        <Button small label="List Your Property" onPress={() => nav.navigate('SellerRegistration')} />
      </Card>
      {user ? <Button variant="outline" label="Sign Out" onPress={signOut} style={styles.signOut} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pad: { paddingHorizontal: 16 },
  profile: { marginHorizontal: 16, backgroundColor: colors.primaryTint },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.textInverse, fontWeight: '700', fontSize: 18 },
  authRow: { marginTop: 10 },
  signOut: { marginHorizontal: 16, marginTop: 14 },
  act: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, gap: 2 },
  list: { marginHorizontal: 16, marginTop: 14, padding: 0 },
  sell: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: colors.primaryTint },
});
