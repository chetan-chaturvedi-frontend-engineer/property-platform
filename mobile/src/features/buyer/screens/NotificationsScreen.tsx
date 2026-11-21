import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card, EmptyState, Header, Icon, Screen } from '../../../components';
import type { IconName } from '../../../components';
import { useAsync } from '../../../hooks/useAsync';
import { useRootNavigation } from '../../../navigation/useRootNavigation';
import { notificationService } from '../../../services/notificationService';
import { colors, typography } from '../../../theme';
import { AppNotification, NotificationKind } from '../../../types';
import { formatListTime } from '../../../utils/dates';
import { useAuth } from '../../auth/AuthProvider';
import { useUnreadNotifications } from '../UnreadNotificationsProvider';

const ICON: Record<NotificationKind, IconName> = {
  site_visit_booked: 'calendar-outline',
  property_status_changed: 'business-outline',
};

export function NotificationsScreen() {
  const nav = useRootNavigation();
  const { status } = useAuth();
  const { refresh } = useUnreadNotifications();
  const signedIn = status === 'signedIn';
  const { data, loading, error, reload } = useAsync(() => (signedIn ? notificationService.list() : Promise.resolve([])), [signedIn]);
  const list = data ?? [];
  const hasUnread = list.some(n => !n.read);

  async function open(n: AppNotification) {
    if (!n.read) {
      await notificationService.markRead(n.id).catch(() => undefined);
      reload();
      refresh();
    }
    if (n.kind === 'site_visit_booked') {
      nav.navigate('Bookings');
    } else if (n.propertyId !== undefined) {
      nav.navigate('SellerPropertyDetails', { id: String(n.propertyId) });
    }
  }

  async function readAll() {
    await notificationService.markAllRead().catch(() => undefined);
    reload();
    refresh();
  }

  return (
    <Screen>
      <Header
        title="Notifications"
        subtitle="Stay updated with the latest updates"
        right={signedIn && hasUnread ? <Text style={styles.readAll} onPress={readAll} accessibilityRole="button">Mark all read</Text> : undefined}
      />
      {status === 'signedOut' ? <EmptyState title="Sign in to see your notifications" actionLabel="Sign In" onAction={() => nav.navigate('Login')} /> : null}
      {signedIn && error ? <EmptyState title="Could not load notifications" body={error.message} actionLabel="Retry" onAction={reload} /> : null}
      {signedIn && loading && !data ? <EmptyState title="Loading…" /> : null}
      {signedIn && !loading && !error && list.length === 0 ? <EmptyState title="You are all caught up" body="Bookings and review decisions appear here." /> : null}
      {list.map(n => (
        <Card key={n.id} style={styles.card}>
          <View style={styles.tile}><Icon name={ICON[n.kind]} size={20} /></View>
          <View style={styles.flex}>
            <View style={styles.row}>
              <Text style={[typography.h3, styles.flex]} onPress={() => open(n)} accessibilityRole="button">{n.title}</Text>
              <Text style={typography.tiny}>{formatListTime(n.createdAt)}</Text>
            </View>
            <Text style={typography.muted}>{n.body}</Text>
          </View>
          {!n.read ? <View style={styles.dot} accessibilityLabel="Unread" /> : null}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginBottom: 10 },
  tile: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
  readAll: { color: colors.primary, fontWeight: '600', fontSize: 12 },
});
