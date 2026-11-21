import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Icon, Logo } from '../../../components';
import { colors, radius, typography } from '../../../theme';

interface Props {
  firstName?: string;
  /** Current plan, e.g. "Individual Seller plan · Up to 3 properties"; absent when there is none. */
  planLabel?: string;
  unreadNotifications: number;
  onAddProperty: () => void;
  onNotifications: () => void;
  onPlans: () => void;
}

/** Dark navy header: brand, bell, serif greeting with a gold accent, plan chip and the main call to action. */
export function DashboardHero({ firstName, planLabel, unreadNotifications, onAddProperty, onNotifications, onPlans }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
      <View style={styles.top}>
        <View style={styles.brand}>
          <Logo size={34} />
          <Text style={styles.wordmark}>Dwellery</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={onNotifications} style={styles.bell}>
          <Icon name="notifications-outline" size={20} color={colors.textInverse} />
          {unreadNotifications > 0 ? (
            <View style={styles.badge}><Text style={styles.badgeText}>{unreadNotifications > 9 ? '9+' : unreadNotifications}</Text></View>
          ) : null}
        </Pressable>
      </View>

      <Text style={styles.welcome}>Welcome back,</Text>
      <Text style={styles.title}>
        {firstName ? `${firstName}, grow your ` : 'Grow your '}
        <Text style={styles.accent}>business</Text>
      </Text>
      <Text style={styles.sub}>Manage your listings, leads and site visits in one place.</Text>

      <View style={styles.actions}>
        <Button small variant="soft" icon="add" label="Add New Property" onPress={onAddProperty} />
        {planLabel ? (
          <Pressable accessibilityRole="button" accessibilityLabel="View plans" onPress={onPlans} style={styles.plan}>
            <Icon name="ribbon-outline" size={14} color={colors.accent} />
            <Text style={styles.planText} numberOfLines={1}>{planLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.dark, paddingHorizontal: 16, paddingBottom: 60, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wordmark: { ...typography.display, fontSize: 26, color: colors.textInverse },
  bell: { width: 40, height: 40, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.overlayLight, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: colors.textInverse, fontSize: 10, fontWeight: '700' },
  welcome: { color: colors.overlayLight, fontSize: 14 },
  title: { ...typography.h1, fontSize: 30, lineHeight: 38, color: colors.textInverse, marginTop: 4 },
  accent: { color: colors.accent },
  sub: { color: colors.overlayLight, fontSize: 13, marginTop: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18, flexWrap: 'wrap' },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8, flexShrink: 1 },
  planText: { color: colors.accent, fontSize: 12, fontWeight: '600', flexShrink: 1 },
});
