import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Chip, IconButton, Screen, SectionTitle, TextField } from '../../../components';
import { useRootNavigation } from '../../../navigation/useRootNavigation';
import { colors, typography } from '../../../theme';
import { PropertyListCard } from '../components/PropertyListCard';
import { useProperties } from '../hooks/useProperties';

export function HomeScreen() {
  const nav = useRootNavigation();
  const { data } = useProperties();
  return (
    <Screen>
      <View style={styles.top}>
        <View style={styles.flex}>
          <Text style={typography.muted}>Location</Text>
          <Text style={typography.h2}>Hyderabad ⌄</Text>
        </View>
        <IconButton name="notifications-outline" badge={3} accessibilityLabel="Notifications" onPress={() => nav.navigate('Notifications')} />
        <IconButton name="options-outline" accessibilityLabel="Filters" onPress={() => nav.navigate('Filters')} />
      </View>
      <View style={styles.search}>
        <TextField icon="search" placeholder="Search by locality, project or builder" />
      </View>
      <View style={styles.chips}>
        <Chip label="EMI Calculator" icon="calculator-outline" onPress={() => nav.navigate('EmiCalculator')} />
        <Chip label="Compare" icon="git-compare-outline" onPress={() => nav.navigate('Compare')} />
        <Chip label="Bookings" icon="calendar-outline" onPress={() => nav.navigate('Bookings')} />
      </View>
      <SectionTitle title="Featured Projects" action="Recently Viewed" onAction={() => nav.navigate('RecentlyViewed')} />
      {(data ?? []).map(p => (
        <PropertyListCard key={p.id} property={p} showActions />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  flex: { flex: 1 },
  search: { paddingHorizontal: 16, paddingTop: 12 },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12, flexWrap: 'wrap', backgroundColor: colors.background },
});
