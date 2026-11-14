import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Alert } from 'react-native';
import { Button, Card, Chip, EmptyState, Header, Icon, IconButton, PropertyPhoto, Screen, SectionTitle, Tag } from '../../../components';
import type { TagTone } from '../../../components';
import { useAsync } from '../../../hooks/useAsync';
import { bookingService } from '../../../services/bookingService';
import { useRootNavigation } from '../../../navigation/useRootNavigation';
import { colors, typography } from '../../../theme';
import { useAuth } from '../../auth/AuthProvider';
import { BookingStatus } from '../../../types';

const tabs: ('All Bookings' | BookingStatus)[] = ['All Bookings', 'Upcoming', 'Completed', 'Cancelled'];
const tone: Record<BookingStatus, TagTone> = { Upcoming: 'primary', Completed: 'success', Cancelled: 'danger' };

export function BookingsScreen() {
  const nav = useRootNavigation();
  const { status } = useAuth();
  const signedIn = status === 'signedIn';
  const { data, loading, error, reload } = useAsync(() => (signedIn ? bookingService.list() : Promise.resolve([])), [signedIn]);
  const [tab, setTab] = useState<(typeof tabs)[number]>('All Bookings');
  const list = (data ?? []).filter(b => tab === 'All Bookings' || b.status === tab);

  function cancel(visitId: number) {
    Alert.alert('Cancel this visit?', 'You can book another slot later.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Cancel visit',
        style: 'destructive',
        onPress: () =>
          bookingService
            .cancel(visitId)
            .then(reload)
            .catch(e => Alert.alert('Could not cancel', e instanceof Error ? e.message : 'Try again.')),
      },
    ]);
  }

  return (
    <Screen>
      <Header title="My Bookings" right={<IconButton name="calendar-outline" accessibilityLabel="Calendar" />} />
      <View style={styles.tabs}>
        {tabs.map(t => <Chip key={t} label={t} active={tab === t} onPress={() => setTab(t)} />)}
      </View>
      <SectionTitle title="Bookings" />
      {status === 'signedOut' ? (
        <EmptyState title="Sign in to see your bookings" body="Your scheduled site visits appear here." actionLabel="Sign In" onAction={() => nav.navigate('Login')} />
      ) : null}
      {signedIn && error ? <EmptyState title="Could not load your bookings" body={error.message} actionLabel="Retry" onAction={reload} /> : null}
      {signedIn && loading && !data ? <EmptyState title="Loading your bookings…" /> : null}
      {signedIn && !loading && !error && list.length === 0 ? <EmptyState title="No bookings yet" body="Book a site visit from any property." /> : null}
      {list.map((b, i) => (
        <Card key={b.id} style={styles.card}>
          <View style={styles.row}>
            <PropertyPhoto tone={i} label={b.type} style={styles.photo} />
            <View style={styles.flex}>
              <View style={styles.title}>
                <Text style={[typography.h3, styles.flex]}>{b.name}</Text>
                <Tag label={b.status} tone={tone[b.status]} />
              </View>
              {b.config ? <Text style={typography.muted}>{b.config}</Text> : null}
              <Text style={typography.muted}>{b.area}</Text>
              <View style={styles.meta}>
                <Icon name="calendar-outline" size={12} />
                <Text style={typography.tiny}>{b.date} • {b.day}</Text>
                <Icon name="time-outline" size={12} />
                <Text style={typography.tiny}>{b.time}</Text>
              </View>
              <Text style={styles.id}>Booking ID  #{b.id}</Text>
            </View>
          </View>
          {b.status === 'Upcoming' ? (
            <View style={[styles.row, styles.actions]}>
              <Button small variant="outline" icon="chatbubble-outline" label="Chat Now" style={styles.flex} />
              <Button small variant="danger" label="Cancel" style={styles.flex} onPress={() => cancel(b.visitId)} />
            </View>
          ) : null}
        </Card>
      ))}
      <Card style={styles.card}>
        <View style={styles.row}>
          <Icon name="headset-outline" size={28} />
          <View style={styles.flex}>
            <Text style={typography.h3}>Need Help?</Text>
            <Text style={typography.muted}>Our property experts are here to help you with any questions.</Text>
          </View>
          <Button small label="Contact Support" />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, flexWrap: 'wrap' },
  card: { marginHorizontal: 16, marginBottom: 12 },
  photo: { width: 92, height: 92 },
  title: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  id: { color: colors.primary, fontSize: 10, fontWeight: '700', marginTop: 4 },
  actions: { marginTop: 10 },
});
