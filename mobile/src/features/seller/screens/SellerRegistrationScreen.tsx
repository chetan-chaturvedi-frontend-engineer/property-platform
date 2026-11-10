import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Header, Icon, Screen, Tag } from '../../../components';
import type { IconName } from '../../../components';
import { useRootNavigation } from '../../../navigation/useRootNavigation';
import { colors, typography } from '../../../theme';

type Kind = 'individual' | 'builder';
const options: { kind: Kind; icon: IconName; title: string; fee: string; sub: string }[] = [
  { kind: 'individual', icon: 'person-outline', title: 'Individual Seller', fee: 'Fee: ₹999', sub: 'For individuals who want to sell their own property (Flat, House, Plot, etc.)' },
  { kind: 'builder', icon: 'business-outline', title: 'Builder / Agent', fee: 'Fee: ₹9,999', sub: 'For builders, developers or businesses who want to list multiple properties.' },
];

export function SellerRegistrationScreen() {
  const nav = useRootNavigation();
  const [kind, setKind] = useState<Kind>('individual');
  return (
    <Screen footer={<Button label="Continue" onPress={() => nav.navigate('SellerVerification')} />}>
      <Header title="Choose Registration Type" subtitle="Select how you want to register" />
      <Text style={styles.q}>How would you like to register?</Text>
      {options.map(o => {
        const active = kind === o.kind;
        return (
          <Pressable key={o.kind} accessibilityRole="radio" accessibilityState={{ selected: active }} onPress={() => setKind(o.kind)}>
            <Card style={[styles.card, active && styles.active]}>
              <View style={styles.row}>
                <Icon name={o.icon} size={26} />
                <View style={styles.flex}>
                  <View style={styles.row}><Text style={typography.h3}>{o.title}</Text><Tag label={o.fee} /></View>
                  <Text style={typography.muted}>{o.sub}</Text>
                </View>
                <Icon name={active ? 'radio-button-on' : 'radio-button-off'} size={20} />
              </View>
            </Card>
          </Pressable>
        );
      })}
      <Card style={styles.card}>
        <Text style={typography.h3}>Why Register?</Text>
        {['List your properties & reach genuine buyers', 'Manage inquiries and site visits', 'Get trusted & verified seller badge', 'Grow your visibility on our platform'].map(t => (
          <View key={t} style={styles.row}><Icon name="checkmark-circle" size={16} color={colors.success} /><Text style={typography.muted}>{t}</Text></View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  q: { ...typography.h2, paddingHorizontal: 16, marginBottom: 12 },
  card: { marginHorizontal: 16, marginBottom: 12, gap: 8 },
  active: { borderColor: colors.primary, borderWidth: 2 },
});
