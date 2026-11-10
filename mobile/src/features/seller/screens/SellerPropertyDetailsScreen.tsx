import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, Header, PropertyPhoto, Screen, SectionTitle, Tag } from '../../../components';
import { RootScreenProps } from '../../../navigation/types';
import { colors, typography } from '../../../theme';
import { useSellerListings } from '../hooks/useSeller';

const overview: [string, string][] = [['Property Type', 'Apartment / Flat'], ['Property Facing', 'East'], ['Age of Property', '5 to 10 Years Old'], ['Furnishing Status', 'Semi Furnished']];

export function SellerPropertyDetailsScreen({ navigation, route }: RootScreenProps<'SellerPropertyDetails'>) {
  const { data } = useSellerListings();
  const l = (data ?? []).find(x => x.id === route.params.id);
  return (
    <Screen>
      <Header title="Property Details" subtitle={l ? `Listed • ID: ${l.id.toUpperCase()}` : undefined} />
      <PropertyPhoto tone={1} label="1 / 15" style={styles.hero} />
      <View style={styles.pad}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={typography.h2}>{l?.title}</Text>
            <Text style={typography.muted}>{l?.area}</Text>
          </View>
          <View><Text style={styles.price}>{l?.price}</Text><Tag label={l?.status ?? ''} tone="success" /></View>
        </View>
        <View style={styles.row}>
          <Button small variant="soft" label="Edit" style={styles.flex} onPress={() => navigation.navigate('AddProperty')} />
          <Button small variant="soft" label="Analytics" style={styles.flex} onPress={() => navigation.navigate('PropertyPerformance', { id: route.params.id })} />
          <Button small variant="danger" label="Delete" style={styles.flex} />
        </View>
      </View>
      <SectionTitle title="Property Overview" />
      <Card style={styles.card}>
        {overview.map(([k, v]) => <View key={k} style={styles.spread}><Text style={typography.muted}>{k}</Text><Text style={typography.h3}>{v}</Text></View>)}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  pad: { paddingHorizontal: 16 },
  hero: { height: 200, marginHorizontal: 16, borderRadius: 16 },
  price: { color: colors.primary, fontWeight: '700', fontSize: 16 },
  card: { marginHorizontal: 16, gap: 10 },
  spread: { flexDirection: 'row', justifyContent: 'space-between' },
});
