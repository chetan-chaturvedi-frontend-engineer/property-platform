import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Chip, QuickActionTile, Screen, SectionTitle } from '../../../components';
import { useStatusBarStyle } from '../../../hooks/useStatusBarStyle';
import { BuyerTabParamList } from '../../../navigation/types';
import { useRootNavigation } from '../../../navigation/useRootNavigation';
import { colors, typography } from '../../../theme';
import { useAuth } from '../../auth/AuthProvider';
import { BannerStrip } from '../components/BannerStrip';
import { FeaturedPropertyCard } from '../components/FeaturedPropertyCard';
import { HomeHero } from '../components/HomeHero';
import { TopBuilders } from '../components/TopBuilders';
import { usePropertySearch } from '../hooks/useProperties';
import { usePropertyFilters } from '../PropertyFiltersProvider';
import { useUnreadNotifications } from '../UnreadNotificationsProvider';

const FEATURED_COUNT = 8;
const BUILDER_COUNT = 8;

export function HomeScreen() {
  const nav = useRootNavigation();
  const tabs = useNavigation<BottomTabNavigationProp<BuyerTabParamList>>();
  const { user } = useAuth();
  const { unread: unreadNotifications } = useUnreadNotifications();
  const { filters, activeCount, setFilters, setSearch } = usePropertyFilters();
  const { data: page, loading, error, reload } = usePropertySearch();
  useStatusBarStyle('light-content');

  const items = useMemo(() => page?.items ?? [], [page]);
  const builders = useMemo(
    () => [...new Set(items.map(p => p.builder).filter((b): b is string => Boolean(b)))].slice(0, BUILDER_COUNT),
    [items],
  );

  const browse = (propertyType: string | null) => {
    setFilters({ ...filters, propertyType });
    tabs.navigate('Search');
  };
  const searchBuilder = (name: string) => {
    setSearch(name);
    tabs.navigate('Search');
  };

  return (
    <Screen edges={[]}>
      <HomeHero
        firstName={user?.fullName.split(' ')[0]}
        unreadNotifications={unreadNotifications}
        filterCount={activeCount}
        onNotifications={() => nav.navigate('Notifications')}
        onProfile={() => tabs.navigate('Profile')}
        onFilters={() => nav.navigate('Filters')}
      />

      <View style={styles.tiles}>
        <QuickActionTile icon="business-outline" label={'Apartments\n(Flats)'} onPress={() => browse('Apartment')} />
        <QuickActionTile icon="home-outline" label={'Villas\n(Houses)'} onPress={() => browse('Villa')} />
        <QuickActionTile icon="construct-outline" label={'Builder\nProjects'} onPress={() => browse(null)} />
        <QuickActionTile icon="shield-checkmark-outline" label={'Verified\nListings'} onPress={() => browse(null)} />
      </View>

      <BannerStrip placement="home_top" />

      <SectionTitle title="Featured Properties" action="View All" onAction={() => tabs.navigate('Search')} />
      {error ? (
        <View style={styles.state}>
          <Text style={typography.muted}>Could not load properties. Check your connection and try again.</Text>
          <Button small variant="outline" label="Retry" onPress={reload} />
        </View>
      ) : null}
      {loading && !page ? <Text style={[typography.muted, styles.state]}>Loading properties…</Text> : null}
      {!loading && !error && items.length === 0 ? <Text style={[typography.muted, styles.state]}>No properties match your search.</Text> : null}
      {items.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
          {items.slice(0, FEATURED_COUNT).map(p => (
            <FeaturedPropertyCard key={p.id} property={p} />
          ))}
        </ScrollView>
      ) : null}

      {builders.length > 0 ? (
        <>
          <SectionTitle title="Top Builders on Dwellery" action="View All" onAction={() => tabs.navigate('Search')} />
          <TopBuilders builders={builders} onSelect={searchBuilder} />
        </>
      ) : null}

      <SectionTitle title="Tools" />
      <View style={styles.chips}>
        <Chip label="EMI Calculator" icon="calculator-outline" onPress={() => nav.navigate('EmiCalculator')} />
        <Chip label="Compare" icon="git-compare-outline" onPress={() => nav.navigate('Compare')} />
        <Chip label="Recently Viewed" icon="time-outline" onPress={() => nav.navigate('RecentlyViewed')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 18 },
  strip: { gap: 12, paddingHorizontal: 16, paddingBottom: 4 },
  state: { padding: 16, gap: 12 },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, flexWrap: 'wrap', backgroundColor: colors.background },
});
