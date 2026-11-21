import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Chip, IconButton, Screen, SectionTitle } from '../../../components';
import { useRootNavigation } from '../../../navigation/useRootNavigation';
import { colors, typography } from '../../../theme';
import { BannerStrip } from '../components/BannerStrip';
import { PropertyListCard } from '../components/PropertyListCard';
import { SearchBox } from '../components/SearchBox';
import { usePropertySearch } from '../hooks/useProperties';
import { usePropertyFilters } from '../PropertyFiltersProvider';

export function HomeScreen() {
  const nav = useRootNavigation();
  const { filters, activeCount } = usePropertyFilters();
  const { data: page, loading, error, reload } = usePropertySearch();
  const data = page?.items;
  return (
    <Screen>
      <View style={styles.top}>
        <View style={styles.flex}>
          <Text style={typography.muted}>Location</Text>
          <Text style={typography.h2}>{filters.city.trim() || 'All Cities'}</Text>
        </View>
        <IconButton name="notifications-outline" accessibilityLabel="Notifications" onPress={() => nav.navigate('Notifications')} />
        <IconButton name="options-outline" badge={activeCount || undefined} accessibilityLabel="Filters" onPress={() => nav.navigate('Filters')} />
      </View>
      <View style={styles.search}>
        <SearchBox />
      </View>
      <BannerStrip placement="home_top" />
      <View style={styles.chips}>
        <Chip label="EMI Calculator" icon="calculator-outline" onPress={() => nav.navigate('EmiCalculator')} />
        <Chip label="Compare" icon="git-compare-outline" onPress={() => nav.navigate('Compare')} />
        <Chip label="Bookings" icon="calendar-outline" onPress={() => nav.navigate('Bookings')} />
      </View>
      <SectionTitle title={page ? `${page.total} ${page.total === 1 ? 'Project' : 'Projects'}` : 'Projects'} action="Recently Viewed" onAction={() => nav.navigate('RecentlyViewed')} />
      {error ? (
        <View style={styles.state}>
          <Text style={typography.muted}>Could not load properties. Check your connection and try again.</Text>
          <Button small variant="outline" label="Retry" onPress={reload} />
        </View>
      ) : null}
      {loading && !data ? <Text style={[typography.muted, styles.state]}>Loading properties…</Text> : null}
      {!loading && !error && data?.length === 0 ? (
        <Text style={[typography.muted, styles.state]}>No properties match your search.</Text>
      ) : null}
      {(data ?? []).map(p => (
        <PropertyListCard key={p.id} property={p} showActions />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  flex: { flex: 1 },
  state: { padding: 16, gap: 12 },
  search: { paddingHorizontal: 16, paddingTop: 12 },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12, flexWrap: 'wrap', backgroundColor: colors.background },
});
