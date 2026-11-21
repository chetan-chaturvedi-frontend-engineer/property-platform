import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Chip, Icon, IconButton, Screen, SectionTitle } from '../../../components';
import { useRootNavigation } from '../../../navigation/useRootNavigation';
import { colors, radius, typography } from '../../../theme';
import { PropertyListCard } from '../components/PropertyListCard';
import { SearchBox } from '../components/SearchBox';
import { usePropertySearch } from '../hooks/useProperties';
import { usePropertyFilters } from '../PropertyFiltersProvider';


export function MapSearchScreen() {
  const nav = useRootNavigation();
  const { filters, activeCount } = usePropertyFilters();
  const { data: page } = usePropertySearch();
  const data = page?.items;
  return (
    <Screen scroll={false}>
      <View style={styles.top}>
        <Text style={typography.h2}>Map View</Text>
        <Text style={typography.muted}>Explore properties around you</Text>
        <View style={styles.search}>
          <View style={styles.flex}><SearchBox /></View>
          <IconButton name="options-outline" badge={activeCount || undefined} accessibilityLabel="Filters" onPress={() => nav.navigate('Filters')} />
        </View>
        <View style={styles.chips}>
          <Chip label={filters.budget ? 'Budget set' : 'Budget'} active={!!filters.budget} onPress={() => nav.navigate('Filters')} />
          <Chip label={filters.bhk ?? 'BHK'} active={!!filters.bhk} onPress={() => nav.navigate('Filters')} />
          <Chip label={filters.propertyType ?? 'Type'} active={!!filters.propertyType} onPress={() => nav.navigate('Filters')} />
        </View>
      </View>

      <View style={styles.map} accessibilityLabel="Map placeholder">
        <Icon name="map" size={64} color={colors.border} />
        <Text style={typography.tiny}>Interactive map needs a map SDK and API key.</Text>
      </View>

      <View style={styles.sheet}>
        <SectionTitle title={page ? `${page.total} ${page.total === 1 ? 'Property' : 'Properties'}` : 'Properties'} />
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
  sheet: { flex: 1, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, backgroundColor: colors.background, marginTop: -16 },
});
