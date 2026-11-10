import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, Header, Icon, IconButton, PropertyPhoto, Screen, Tag } from '../../../components';
import { useRootNavigation } from '../../../navigation/useRootNavigation';
import { typography } from '../../../theme';
import { useSellerListings } from '../hooks/useSeller';

const tabs = ['All', 'For Sale', 'For Rent', 'Draft'] as const;

export function MyPropertiesScreen() {
  const nav = useRootNavigation();
  const { data } = useSellerListings();
  const [tab, setTab] = useState<(typeof tabs)[number]>('All');
  const list = (data ?? []).filter(l => tab === 'All' || l.purpose === tab);
  return (
    <Screen>
      <Header title="My Properties" subtitle="Manage and view all your properties" showBack={false} right={<IconButton name="add" accessibilityLabel="Add property" onPress={() => nav.navigate('AddProperty')} />} />
      <View style={styles.tabs}>{tabs.map(t => <Chip key={t} label={t} active={tab === t} onPress={() => setTab(t)} />)}</View>
      {list.map((l, i) => (
        <Pressable key={l.id} accessibilityRole="button" onPress={() => nav.navigate('SellerPropertyDetails', { id: l.id })}>
          <Card style={styles.card}>
            <View style={styles.row}>
              <PropertyPhoto tone={i} style={styles.photo} />
              <View style={styles.flex}>
                <Text style={typography.h3}>{l.title}</Text>
                <Text style={typography.muted}>{l.area}</Text>
                <View style={styles.row}><Text style={typography.h3}>{l.price}</Text><Tag label={l.purpose} tone={l.purpose === 'Draft' ? 'orange' : 'success'} /></View>
                <View style={styles.row}>
                  <Icon name="eye-outline" size={12} /><Text style={typography.tiny}>{l.views} Views</Text>
                  <Icon name="person-outline" size={12} /><Text style={typography.tiny}>{l.leads} Leads</Text>
                </View>
              </View>
            </View>
            <View style={[styles.row, styles.actions]}>
              <Button small variant="outline" label="Performance" style={styles.flex} onPress={() => nav.navigate('PropertyPerformance', { id: l.id })} />
              <Button small variant="soft" label="Edit" style={styles.flex} onPress={() => nav.navigate('AddProperty')} />
            </View>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12, flexWrap: 'wrap' },
  card: { marginHorizontal: 16, marginBottom: 12 },
  photo: { width: 96, height: 96 },
  actions: { marginTop: 10 },
});
