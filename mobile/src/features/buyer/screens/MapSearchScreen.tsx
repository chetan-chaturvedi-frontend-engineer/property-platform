import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Chip, Icon, IconButton, Screen, SectionTitle, TextField } from '../../../components';
import { useRootNavigation } from '../../../navigation/useRootNavigation';
import { colors, radius, typography } from '../../../theme';
import { PropertyListCard } from '../components/PropertyListCard';
import { useProperties } from '../hooks/useProperties';

// Pin positions are placeholders until a map SDK (e.g. react-native-maps + API key) is wired in.
const pins = [
  { top: '14%', left: '48%', label: '₹1.25 Cr*' },
  { top: '38%', left: '14%', label: '₹1.10 Cr*' },
  { top: '62%', left: '56%', label: '₹1.45 Cr*' },
  { top: '30%', left: '74%', label: '₹98 L*' },
];

export function MapSearchScreen() {
  const nav = useRootNavigation();
  const { data } = useProperties();
  return (
    <Screen scroll={false}>
      <View style={styles.top}>
        <Text style={typography.h2}>Map View</Text>
        <Text style={typography.muted}>Explore properties around you</Text>
        <View style={styles.search}>
          <View style={styles.flex}><TextField icon="search" placeholder="Search by locality, project or builder" /></View>
          <IconButton name="options-outline" accessibilityLabel="Filters" onPress={() => nav.navigate('Filters')} />
        </View>
        <View style={styles.chips}>
          <Chip label="Buy" active />
          <Chip label="Budget" />
          <Chip label="BHK" />
          <Chip label="Type" />
        </View>
      </View>

      <View style={styles.map} accessibilityLabel="Map placeholder">
        <Icon name="map" size={64} color={colors.border} />
        {pins.map(p => (
          <View key={p.label} style={[styles.pin, { top: p.top as never, left: p.left as never }]}>
            <Text style={styles.pinText}>{p.label}</Text>
          </View>
        ))}
        <View style={styles.mapBtn}><Button small variant="outline" icon="locate" label="Show Nearby" /></View>
      </View>

      <View style={styles.sheet}>
        <SectionTitle title="Properties Near You" action="Sort: Relevance" />
        <Screen scroll>
          {(data ?? []).map(p => <PropertyListCard key={p.id} property={p} />)}
        </Screen>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  search: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  chips: { flexDirection: 'row', gap: 8 },
  map: { height: 220, marginTop: 8, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  pin: { position: 'absolute', backgroundColor: colors.background, borderRadius: radius.md, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: colors.primary },
  pinText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  mapBtn: { position: 'absolute', right: 12, bottom: 12 },
  sheet: { flex: 1, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, backgroundColor: colors.background, marginTop: -16 },
});
