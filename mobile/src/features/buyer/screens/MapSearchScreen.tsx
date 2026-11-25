import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Chip, EmptyState, IconButton, Screen, SectionTitle } from '../../../components';
import { useRootNavigation } from '../../../navigation/useRootNavigation';
import { colors, radius, typography } from '../../../theme';
import { Property } from '../../../types';
import { PropertyListCard } from '../components/PropertyListCard';
import { PropertyMap, mapAvailable } from '../components/PropertyMap';
import { SearchBox } from '../components/SearchBox';
import { useMapSearch } from '../hooks/useMapSearch';
import { usePropertyFilters } from '../PropertyFiltersProvider';

export function MapSearchScreen() {
  const nav = useRootNavigation();
  const { filters, activeCount } = usePropertyFilters();
  const { all, visible, unplaced, refreshing, setBounds } = useMapSearch();
  const [selected, setSelected] = useState<Property>();

  const allItems = all.data?.items;
  const framing = useMemo(() => allItems ?? [], [allItems]);
  // Pins from the whole result set plus the visible area, so panning does not make pins blink away.
  const pins = useMemo(() => {
    const byId = new Map<string, Property>();
    [...(allItems ?? []), ...visible].forEach(p => p.coordinate && byId.set(p.id, p));
    return [...byId.values()];
  }, [allItems, visible]);

  const loaded = all.data !== undefined;
  const nothingOnMap = loaded && pins.length === 0;
  const emptyMessage = !mapAvailable || !loaded
    ? undefined
    : nothingOnMap
      ? allItems && allItems.length > 0
        ? 'These properties have no map position yet.'
        : 'No properties match your search.'
      : !refreshing && visible.length === 0
        ? 'No properties in this area.'
        : undefined;

  const total = all.data?.total;
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

      <PropertyMap
        properties={pins}
        framing={framing}
        selectedId={selected?.id}
        onSelect={setSelected}
        onBoundsChange={setBounds}
        emptyMessage={emptyMessage}>
        {selected ? <PropertyListCard property={selected} /> : null}
      </PropertyMap>

      <View style={styles.sheet}>
        <SectionTitle
          title={
            mapAvailable
              ? `${visible.length} in this area${total !== undefined ? ` · ${total} total` : ''}`
              : total !== undefined
                ? `${total} ${total === 1 ? 'Property' : 'Properties'}`
                : 'Properties'
          }
        />
        <Screen scroll edges={[]}>
          {(mapAvailable ? visible : allItems ?? []).map(p => <PropertyListCard key={p.id} property={p} />)}
          {all.error ? <EmptyState title="Could not load properties" body="Check your connection and try again." actionLabel="Retry" onAction={all.reload} /> : null}
          {mapAvailable && unplaced.length > 0 ? (
            <>
              <SectionTitle title="Not on the map yet" />
              {unplaced.map(p => <PropertyListCard key={p.id} property={p} />)}
            </>
          ) : null}
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
  sheet: { height: '38%', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, backgroundColor: colors.background, marginTop: -16 },
});
