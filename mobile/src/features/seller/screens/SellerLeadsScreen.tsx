import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, EmptyState, Header, Icon, IconButton, Screen, Tag } from '../../../components';
import type { TagTone } from '../../../components';
import { useRootNavigation } from '../../../navigation/useRootNavigation';
import { colors, typography } from '../../../theme';
import { useAuth } from '../../auth/AuthProvider';
import { SellerLead } from '../../../types';
import { useSellerLeads } from '../hooks/useSeller';

const tone: Record<SellerLead['kind'], TagTone> = { 'New Lead': 'success', Enquiry: 'primary', Lead: 'orange' };
const tabs = ['All', 'Enquiries', 'Leads'] as const;

export function SellerLeadsScreen() {
  const nav = useRootNavigation();
  const { status } = useAuth();
  const { data, loading, error, reload } = useSellerLeads();
  const [tab, setTab] = useState<(typeof tabs)[number]>('All');
  const list = (data ?? []).filter(l => tab === 'All' || (tab === 'Enquiries' ? l.kind === 'Enquiry' : l.kind !== 'Enquiry'));
  return (
    <Screen>
      <Header title="Messages" subtitle="All your conversations" showBack={false} right={<IconButton name="search" accessibilityLabel="Search" />} />
      <View style={styles.tabs}>{tabs.map(t => <Chip key={t} label={`${t}`} active={tab === t} onPress={() => setTab(t)} />)}</View>
      {status === 'signedOut' ? (
        <EmptyState title="Sign in to see your leads" actionLabel="Sign In" onAction={() => nav.navigate('Login')} />
      ) : null}
      {status === 'signedIn' && error ? <EmptyState title="Could not load your leads" body={error.message} actionLabel="Retry" onAction={reload} /> : null}
      {status === 'signedIn' && !loading && !error && list.length === 0 ? <EmptyState title="No leads yet" body="New enquiries will appear here." /> : null}
      {list.map(l => (
        <View key={l.id} style={styles.row}>
          <View style={styles.avatar}><Text style={styles.initials}>{l.initials}</Text></View>
          <View style={styles.flex}>
            <View style={styles.title}><Text style={typography.h3}>{l.name}</Text><Tag label={l.kind} tone={tone[l.kind]} /></View>
            <Text style={typography.muted} numberOfLines={1}>{l.message}</Text>
          </View>
          <View style={styles.end}>
            <Text style={typography.tiny}>{l.time}</Text>
            {l.unread ? <View style={styles.badge}><Text style={styles.badgeText}>{l.unread}</Text></View> : null}
          </View>
        </View>
      ))}
      <Card style={styles.quick}>
        <Icon name="flash-outline" size={22} />
        <View style={styles.flex}><Text style={typography.h3}>Quick Reply</Text><Text style={typography.tiny}>Use quick replies to save time and respond faster.</Text></View>
        <Button small variant="outline" label="Manage Replies" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  initials: { color: colors.primary, fontWeight: '700' },
  title: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  end: { alignItems: 'flex-end', gap: 6 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: colors.textInverse, fontSize: 10, fontWeight: '700' },
  quick: { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 16, backgroundColor: colors.primaryTint },
});
