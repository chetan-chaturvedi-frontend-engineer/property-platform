import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, Chip, Header, Icon, IconButton, Screen } from '../../../components';
import type { IconName } from '../../../components';
import { colors, typography } from '../../../theme';

type Kind = 'Offers' | 'Updates' | 'Reminders' | 'Messages';
interface Item { id: string; kind: Kind; icon: IconName; title: string; body: string; cta: string; time: string; group: 'Today' | 'Yesterday' }

const items: Item[] = [
  { id: '1', kind: 'Offers', icon: 'pricetag-outline', title: 'Price Drop Alert!', body: 'The price of "Green Valley Residences" has dropped by ₹3.5 Lakhs.', cta: 'View Property', time: '10:30 AM', group: 'Today' },
  { id: '2', kind: 'Updates', icon: 'business-outline', title: 'New Launch Near You!', body: '"Skyline Heights Phase 2" is now launched in Kondapur, Hyderabad.', cta: 'Explore Now', time: '9:15 AM', group: 'Today' },
  { id: '3', kind: 'Reminders', icon: 'calendar-outline', title: 'Upcoming Site Visit Reminder', body: 'You have a site visit scheduled for "Urban Elite" on 18 May 2025 at 11:00 AM.', cta: 'View Details', time: '8:00 AM', group: 'Today' },
  { id: '4', kind: 'Messages', icon: 'chatbubble-outline', title: 'New Message from Expert', body: 'Rahul Sharma replied to your query about "Green Valley Residences".', cta: 'Open Chat', time: '7:45 PM', group: 'Yesterday' },
  { id: '5', kind: 'Updates', icon: 'flame-outline', title: 'Your Shortlisted Property is in High Demand', body: '"Skyline Heights" is getting a lot of interest. Book your site visit today!', cta: 'Book Now', time: '5:30 PM', group: 'Yesterday' },
  { id: '6', kind: 'Updates', icon: 'shield-checkmark-outline', title: 'Loan Pre-Approval Successful', body: 'Congratulations! You are pre-approved for a loan up to ₹1.25 Crore.', cta: 'View Details', time: '2:10 PM', group: 'Yesterday' },
];
const tabs: ('All' | Kind)[] = ['All', 'Offers', 'Updates', 'Reminders', 'Messages'];

export function NotificationsScreen() {
  const [tab, setTab] = useState<(typeof tabs)[number]>('All');
  const list = items.filter(i => tab === 'All' || i.kind === tab);
  return (
    <Screen>
      <Header title="Notifications" subtitle="Stay updated with the latest updates" right={<IconButton name="settings-outline" accessibilityLabel="Notification settings" />} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {tabs.map(t => <Chip key={t} label={t} active={tab === t} onPress={() => setTab(t)} />)}
      </ScrollView>
      {(['Today', 'Yesterday'] as const).map(g => {
        const group = list.filter(i => i.group === g);
        return group.length ? (
          <View key={g}>
            <Text style={styles.group}>{g}</Text>
            {group.map(i => (
              <Card key={i.id} style={styles.card}>
                <View style={styles.tile}><Icon name={i.icon} size={20} /></View>
                <View style={styles.flex}>
                  <View style={styles.row}><Text style={[typography.h3, styles.flex]}>{i.title}</Text><Text style={typography.tiny}>{i.time}</Text></View>
                  <Text style={typography.muted}>{i.body}</Text>
                  <Text style={styles.cta}>{i.cta} →</Text>
                </View>
                <View style={styles.dot} />
              </Card>
            ))}
          </View>
        ) : null;
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabs: { gap: 8, paddingHorizontal: 16 },
  group: { ...typography.h3, paddingHorizontal: 16, marginTop: 16, marginBottom: 8 },
  card: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginBottom: 10 },
  tile: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 8 },
  cta: { color: colors.primary, fontWeight: '600', fontSize: 12, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
});
