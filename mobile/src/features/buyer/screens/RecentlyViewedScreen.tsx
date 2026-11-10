import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, Header, Icon, Screen } from '../../../components';
import { useRootNavigation } from '../../../navigation/useRootNavigation';
import { colors, typography } from '../../../theme';
import { PropertyListCard } from '../components/PropertyListCard';
import { useProperties } from '../hooks/useProperties';

const stats = [['18', 'Viewed Properties'], ['7', 'Projects'], ['11', 'Flats'], ['3', 'Today']];

export function RecentlyViewedScreen() {
  const nav = useRootNavigation();
  const { data } = useProperties();
  return (
    <Screen>
      <Header title="Recently Viewed" subtitle="Properties you recently explored" right={<Text style={styles.clear}>Clear All</Text>} />
      <Card style={styles.stats}>
        <View style={styles.spread}>
          {stats.map(([n, l]) => (
            <View key={l} style={styles.stat}><Text style={typography.h2}>{n}</Text><Text style={typography.tiny}>{l}</Text></View>
          ))}
        </View>
      </Card>
      <View style={styles.chips}>
        {['All (18)', 'Projects (7)', 'Flats (11)', 'Plots (0)', 'Villas (0)'].map((c, i) => <Chip key={c} label={c} active={i === 0} />)}
      </View>
      <Text style={styles.group}>Today</Text>
      {(data ?? []).map(p => <PropertyListCard key={p.id} property={p} onToggleLike={() => undefined} />)}
      <Card style={styles.cta}>
        <Icon name="time-outline" size={22} />
        <View style={styles.flex}>
          <Text style={typography.h3}>Can't find what you are looking for?</Text>
          <Text style={typography.tiny}>Save your favourite properties to access them anytime.</Text>
        </View>
        <Button small icon="heart-outline" label="View Shortlist" onPress={() => nav.navigate('BuyerTabs')} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  clear: { color: colors.danger, fontWeight: '600', fontSize: 12 },
  stats: { marginHorizontal: 16 },
  spread: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginTop: 12 },
  group: { ...typography.h3, paddingHorizontal: 16, marginVertical: 12 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16 },
});
