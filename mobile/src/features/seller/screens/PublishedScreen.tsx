import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Icon, Screen } from '../../../components';
import { useRootNavigation } from '../../../navigation/useRootNavigation';
import { colors, typography } from '../../../theme';

const next = [
  { icon: 'time-outline', t: 'We review your listing', s: 'Our team checks the details and photos, usually within a day.' },
  { icon: 'eye-outline', t: 'It goes live once approved', s: 'Buyers can then find it and book site visits.' },
  { icon: 'create-outline', t: 'Track it anytime', s: 'See its status under My Properties.' },
] as const;

export function PublishedScreen() {
  const nav = useRootNavigation();
  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.tick}><Icon name="checkmark" size={44} color={colors.textInverse} /></View>
        <Text style={typography.h1}>Submitted for Review</Text>
        <Text style={[typography.muted, styles.center]}>Your property has been submitted. It will go live after it is approved.</Text>
      </View>
      <Text style={styles.h}>What happens next?</Text>
      {next.map(n => (
        <View key={n.t} style={styles.item}>
          <Icon name={n.icon} size={22} />
          <View style={styles.flex}><Text style={typography.h3}>{n.t}</Text><Text style={typography.muted}>{n.s}</Text></View>
        </View>
      ))}
      <View style={styles.actions}>
        <Button label="View My Properties" onPress={() => nav.reset({ index: 0, routes: [{ name: 'SellerTabs' }] })} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { alignItems: 'center', gap: 10, padding: 32 },
  tick: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
  h: { ...typography.h3, paddingHorizontal: 16, marginBottom: 8 },
  item: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  actions: { padding: 16, gap: 10 },
});
