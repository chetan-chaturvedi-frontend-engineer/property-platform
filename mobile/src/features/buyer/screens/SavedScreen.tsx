import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Chip, Header, Icon, Screen } from '../../../components';
import { useRootNavigation } from '../../../navigation/useRootNavigation';
import { colors, typography } from '../../../theme';
import { PropertyListCard } from '../components/PropertyListCard';
import { useProperties } from '../hooks/useProperties';

export function SavedScreen() {
  const nav = useRootNavigation();
  const { data } = useProperties();
  const [removed, setRemoved] = useState<string[]>([]);
  const saved = (data ?? []).filter(p => !removed.includes(p.id));

  return (
    <Screen>
      <Header title="My Shortlist" subtitle="Properties you've saved for later" showBack={false} />
      <View style={styles.row}>
        <Chip label="Sort: Recently Added" icon="swap-vertical" />
        <Chip label="Filter" icon="funnel-outline" onPress={() => nav.navigate('Filters')} />
      </View>
      <View style={styles.banner}>
        <Icon name="heart" size={22} color={colors.danger} />
        <View style={styles.flex}>
          <Text style={typography.h3}>Easily compare your favorite properties</Text>
          <Text style={typography.tiny}>Review and shortlist the best options for you.</Text>
        </View>
        <Button small label={`Compare (${Math.min(saved.length, 4)})`} onPress={() => nav.navigate('Compare')} />
      </View>
      {saved.map(p => (
        <PropertyListCard key={p.id} property={p} liked showActions onToggleLike={() => setRemoved(r => [...r, p.id])} />
      ))}
      {saved.length === 0 ? <Text style={styles.empty}>No saved properties yet.</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 16, padding: 12, borderRadius: 12, backgroundColor: colors.primaryTint },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
});
