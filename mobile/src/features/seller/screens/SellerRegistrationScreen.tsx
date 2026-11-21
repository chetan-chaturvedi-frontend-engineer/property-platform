import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, EmptyState, Header, Icon, Screen, Tag } from '../../../components';
import { useRootNavigation } from '../../../navigation/useRootNavigation';
import { colors, typography } from '../../../theme';
import { useSellerRegistration } from '../hooks/useSellerRegistration';
import { useMySubscription, useSubscriptionPlans } from '../hooks/useSeller';

export function SellerRegistrationScreen() {
  const nav = useRootNavigation();
  const plans = useSubscriptionPlans();
  const current = useMySubscription();
  const f = useSellerRegistration();

  async function onContinue() {
    const outcome = await f.subscribe();
    if (outcome === 'subscribed') {
      nav.reset({ index: 0, routes: [{ name: 'SellerTabs' }] });
    } else if (outcome === 'needsLogin') {
      nav.navigate('Login');
    }
  }

  const label = f.submitting ? 'Activating…' : 'Continue';

  return (
    <Screen footer={<Button label={label} onPress={onContinue} disabled={f.submitting || f.selected === undefined} />}>
      <Header title="Choose Your Plan" subtitle="Pick a plan to start listing properties" />
      {current.data ? (
        <Card style={styles.card}>
          <Text style={typography.h3}>You are on the {current.data.planTitle} plan</Text>
          <Button small variant="outline" label="Go to my listings" onPress={() => nav.reset({ index: 0, routes: [{ name: 'SellerTabs' }] })} />
        </Card>
      ) : null}
      {plans.error ? <EmptyState title="Could not load plans" body={plans.error.message} actionLabel="Retry" onAction={plans.reload} /> : null}
      {plans.loading && !plans.data ? <EmptyState title="Loading plans…" /> : null}
      {(plans.data ?? []).map(p => {
        const active = f.selected === p.id;
        return (
          <Pressable key={p.id} accessibilityRole="radio" accessibilityState={{ selected: active }} onPress={() => f.setSelected(p.id)}>
            <Card style={[styles.card, active && styles.active]}>
              <View style={styles.row}>
                <View style={styles.flex}>
                  <View style={styles.row}><Text style={typography.h3}>{p.title}</Text>{p.popular ? <Tag label="Popular" tone="success" /> : null}</View>
                  <Text style={styles.price}>{p.priceLabel}</Text>
                  <Text style={typography.muted}>{p.limitLabel}</Text>
                  {p.description ? <Text style={typography.muted}>{p.description}</Text> : null}
                </View>
                <Icon name={active ? 'radio-button-on' : 'radio-button-off'} size={20} />
              </View>
              {p.features.map(t => (
                <View key={t} style={styles.row}><Icon name="checkmark-circle" size={16} color={colors.success} /><Text style={typography.muted}>{t}</Text></View>
              ))}
            </Card>
          </Pressable>
        );
      })}
      {f.error ? <Text style={styles.error}>{f.error}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  card: { marginHorizontal: 16, marginBottom: 12, gap: 8 },
  active: { borderColor: colors.primary, borderWidth: 2 },
  price: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  error: { color: colors.danger, fontSize: 12, paddingHorizontal: 16 },
});
