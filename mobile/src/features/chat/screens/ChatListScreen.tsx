import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Chip, Header, IconButton, Screen, TextField } from '../../../components';
import { useRootNavigation } from '../../../navigation/useRootNavigation';
import { colors, typography } from '../../../theme';
import { initialsOf } from '../../../utils/format';
import { useChatThreads } from '../hooks/useChat';

const tabs = ['All', 'Enquiries', 'Bookings'];

export function ChatListScreen() {
  const nav = useRootNavigation();
  const { data } = useChatThreads();
  const [tab, setTab] = useState('All');
  const [q, setQ] = useState('');
  const list = (data ?? []).filter(t => t.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <Screen>
      <Header title="Messages" showBack={false} right={<IconButton name="options-outline" accessibilityLabel="Filter" />} />
      <View style={styles.pad}><TextField icon="search" placeholder="Search conversations" value={q} onChangeText={setQ} /></View>
      <View style={[styles.tabs, styles.pad]}>{tabs.map(t => <Chip key={t} label={t} active={tab === t} onPress={() => setTab(t)} />)}</View>
      {list.map(t => (
        <Pressable key={t.id} accessibilityRole="button" onPress={() => nav.navigate('Chat', { id: t.id, title: t.name })} style={styles.row}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initialsOf(t.name)}</Text></View>
          <View style={styles.flex}>
            <Text style={typography.h3}>{t.name}</Text>
            <Text style={typography.tiny}>{t.role}</Text>
            <Text style={typography.muted} numberOfLines={1}>{t.lastMessage}</Text>
          </View>
          <View style={styles.end}>
            <Text style={typography.tiny}>{t.time}</Text>
            {t.unread ? <View style={styles.dot} /> : null}
          </View>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { paddingHorizontal: 16 },
  tabs: { flexDirection: 'row', gap: 8, marginVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: '700' },
  end: { alignItems: 'flex-end', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
});
