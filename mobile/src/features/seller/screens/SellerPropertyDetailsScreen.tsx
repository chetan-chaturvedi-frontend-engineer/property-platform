import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button, Card, EmptyState, Header, PropertyPhoto, Screen, SectionTitle, Tag } from '../../../components';
import type { TagTone } from '../../../components';
import { RootScreenProps } from '../../../navigation/types';
import { sellerPropertyService } from '../../../services/sellerPropertyService';
import { colors, typography } from '../../../theme';
import { useSellerProperty } from '../hooks/useSeller';

const tone: Record<string, TagTone> = { Active: 'success', 'Under Review': 'primary', Incomplete: 'orange', Inactive: 'danger' };

export function SellerPropertyDetailsScreen({ navigation, route }: RootScreenProps<'SellerPropertyDetails'>) {
  const { id } = route.params;
  const { data: p, loading, error, reload } = useSellerProperty(id);

  function confirmDelete() {
    Alert.alert('Delete this property?', 'It will be removed from your listings.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          sellerPropertyService
            .remove(id)
            .then(() => navigation.goBack())
            .catch(e => Alert.alert('Could not delete', e instanceof Error ? e.message : 'Try again.')),
      },
    ]);
  }

  if (error) {
    return <Screen><Header title="Property Details" /><EmptyState title="Could not load this property" body={error.message} actionLabel="Retry" onAction={reload} /></Screen>;
  }
  if (!p || loading) {
    return <Screen><Header title="Property Details" /><EmptyState title="Loading…" /></Screen>;
  }

  const overview: [string, string][] = [
    ['Property Type', p.type],
    ['Configuration', p.config],
    ['Built-up Area', p.sqft],
  ].filter((row): row is [string, string] => row[1] !== '');

  return (
    <Screen>
      <Header title="Property Details" subtitle={`Listing ID: ${p.id}`} />
      <PropertyPhoto tone={1} uri={p.photoUrls[0]} label={p.photoUrls.length > 0 ? `1 / ${p.photoUrls.length}` : undefined} style={styles.hero} />
      <View style={styles.pad}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={typography.h2}>{p.title}</Text>
            <Text style={typography.muted}>{p.area}</Text>
          </View>
          <View style={styles.end}>
            {p.price ? <Text style={styles.price}>{p.price}</Text> : null}
            <Tag label={p.status} tone={tone[p.status] ?? 'primary'} />
          </View>
        </View>
        {p.rejectionReason ? <Text style={styles.rejected}>Rejected: {p.rejectionReason}</Text> : null}
        {!p.readyToSubmit && p.missing.length > 0 ? <Text style={typography.muted}>Still missing: {p.missing.join(', ')}.</Text> : null}
        <View style={styles.row}>
          <Button small variant="danger" label="Delete" style={styles.flex} onPress={confirmDelete} />
        </View>
      </View>
      <SectionTitle title="Property Overview" />
      <Card style={styles.card}>
        {overview.map(([k, v]) => <View key={k} style={styles.spread}><Text style={typography.muted}>{k}</Text><Text style={typography.h3}>{v}</Text></View>)}
      </Card>
      {p.description ? (
        <>
          <SectionTitle title="About" />
          <Text style={[typography.body, styles.pad]}>{p.description}</Text>
        </>
      ) : null}
      {p.amenities.length > 0 ? (
        <>
          <SectionTitle title="Amenities" />
          <Text style={[typography.muted, styles.pad]}>{p.amenities.join(' • ')}</Text>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  end: { alignItems: 'flex-end', gap: 4 },
  pad: { paddingHorizontal: 16 },
  hero: { height: 200, marginHorizontal: 16, borderRadius: 16 },
  price: { color: colors.primary, fontWeight: '700', fontSize: 16 },
  rejected: { color: colors.danger, fontSize: 12, marginTop: 8 },
  card: { marginHorizontal: 16, gap: 10 },
  spread: { flexDirection: 'row', justifyContent: 'space-between' },
});
