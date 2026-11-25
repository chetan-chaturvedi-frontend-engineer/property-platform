import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { EmptyState, Header, Screen, TextField } from '../../../components';
import { useRootNavigation } from '../../../navigation/useRootNavigation';
import { colors, typography } from '../../../theme';
import { formatListTime } from '../../../utils/dates';
import { initialsOf } from '../../../utils/format';
import { useAuth } from '../../auth/AuthProvider';
import { useChatThreads } from '../hooks/useChat';

/** `showBack` is for the buyer, who opens messages from the Home header; the seller has them as a tab. */
export function ChatListScreen({ showBack = false }: { showBack?: boolean }) {
  const nav = useRootNavigation();
  const { status } = useAuth();
  const { data, loading, error, reload } = useChatThreads();
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const list = (data ?? []).filter(t => !needle || `${t.title} ${t.subtitle} ${t.lastMessage}`.toLowerCase().includes(needle));
  const signedIn = status === 'signedIn';

  return (
    <Screen>
      <Header title="Messages" showBack={showBack} />
      <View style={styles.pad}><TextField icon="search" placeholder="Search conversations" value={q} onChangeText={setQ} /></View>
      {status === 'signedOut' ? <EmptyState title="Sign in to see your messages" body="Enquire about a property to start a conversation." actionLabel="Sign In" onAction={() => nav.navigate('Login')} /> : null}
      {signedIn && error ? <EmptyState title="Could not load your messages" body={error.message} actionLabel="Retry" onAction={reload} /> : null}
      {signedIn && loading && !data ? <EmptyState title="Loading…" /> : null}
      {signedIn && !loading && !error && (data ?? []).length === 0 ? <EmptyState title="No conversations yet" body='Tap "Enquire Now" on a property to ask its owner.' /> : null}
      {list.map(t => (
        <Pressable key={t.id} accessibilityRole="button" onPress={() => nav.navigate('Chat', { id: t.id, title: t.title, subtitle: t.subtitle })} style={styles.row}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initialsOf(t.title)}</Text></View>
          <View style={styles.flex}>
            <Text style={typography.h3}>{t.title}</Text>
            <Text style={typography.tiny}>{t.subtitle}</Text>
            <Text style={[typography.muted, t.unread > 0 && styles.bold]} numberOfLines={1}>{t.lastMessage}</Text>
          </View>
          <View style={styles.end}>
            <Text style={typography.tiny}>{formatListTime(t.time)}</Text>
            {t.unread > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{t.unread}</Text></View> : null}
          </View>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { paddingHorizontal: 16, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: '700' },
  bold: { fontWeight: '700', color: colors.text },
  end: { alignItems: 'flex-end', gap: 6 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: colors.textInverse, fontSize: 11, fontWeight: '700' },
});
