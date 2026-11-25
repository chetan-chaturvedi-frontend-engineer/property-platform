import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, Logo } from '../../../components';
import type { IconName } from '../../../components';
import { colors, radius, shadows, typography } from '../../../theme';
import { SearchBox } from './SearchBox';

interface Props {
  firstName?: string;
  unreadNotifications: number;
  filterCount: number;
  onNotifications: () => void;
  onProfile: () => void;
  onFilters: () => void;
}

function RoundButton({ icon, label, badge, onPress }: { icon: IconName; label: string; badge?: number; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.round}>
      <Icon name={icon} size={20} color={colors.textInverse} />
      {badge ? <View style={styles.badge}><Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text></View> : null}
    </Pressable>
  );
}

/** Dark navy header with the brand, greeting and a search bar that overlaps its bottom edge. */
export function HomeHero({ firstName, unreadNotifications, filterCount, onNotifications, onProfile, onFilters }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View>
      <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        <View style={styles.top}>
          <View style={styles.brand}>
            <Logo size={34} />
            <Text style={styles.wordmark}>Dwellery</Text>
          </View>
          <View style={styles.actions}>
            <RoundButton icon="notifications-outline" label="Notifications" badge={unreadNotifications} onPress={onNotifications} />
            <RoundButton icon="person-outline" label="Profile" onPress={onProfile} />
          </View>
        </View>
        <Text style={styles.welcome}>{firstName ? `Welcome back, ${firstName}` : 'Welcome back,'}</Text>
        <Text style={styles.title}>
          Find Your <Text style={styles.accent}>Next Home</Text>
        </Text>
        <Text style={styles.sub}>Verified properties for buying, from trusted builders and owners.</Text>
      </View>
      <View style={styles.searchRow}>
        <View style={styles.search}>
          <SearchBox />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Filters" onPress={onFilters} style={styles.filter}>
          <Icon name="options-outline" size={20} color={colors.text} />
          {filterCount ? <View style={styles.badge}><Text style={styles.badgeText}>{filterCount}</Text></View> : null}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.dark, paddingHorizontal: 16, paddingBottom: 56, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wordmark: { ...typography.display, fontSize: 26, color: colors.textInverse },
  actions: { flexDirection: 'row', gap: 8 },
  round: { width: 38, height: 38, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.overlayLight, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: colors.textInverse, fontSize: 10, fontWeight: '700' },
  welcome: { color: colors.overlayLight, fontSize: 14 },
  title: { ...typography.h1, fontSize: 30, lineHeight: 38, color: colors.textInverse, marginTop: 4 },
  accent: { color: colors.accent },
  sub: { color: colors.overlayLight, fontSize: 13, marginTop: 8 },
  searchRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: -26 },
  search: { flex: 1, backgroundColor: colors.background, borderRadius: radius.lg, padding: 4, ...shadows.card },
  filter: { width: 52, borderRadius: radius.lg, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', ...shadows.card },
});
