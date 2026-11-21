import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, Header, Icon, IconButton, PropertyPhoto, Screen, SectionTitle, Tag } from '../../../components';
import type { IconName } from '../../../components';
import { RootScreenProps } from '../../../navigation/types';
import { colors, typography } from '../../../theme';

const specs: { icon: IconName; v: string; l: string }[] = [
  { icon: 'resize-outline', v: '1200 sq.ft.', l: 'Super Built-up' },
  { icon: 'bed-outline', v: '2', l: 'Bedrooms' },
  { icon: 'water-outline', v: '2', l: 'Bathrooms' },
  { icon: 'sunny-outline', v: '1', l: 'Balcony' },
  { icon: 'car-outline', v: '1', l: 'Car Parking' },
];
const highlights = ['Vastu Compliant', 'Excellent Ventilation', 'Premium Fittings', 'Natural Light', 'Smart Home'];
const plan: [string, string][] = [['Carpet Area', '850 sq.ft.'], ['Balcony Area', '70 sq.ft.'], ['Built-up Area', '1050 sq.ft.'], ['Super Built-up Area', '1200 sq.ft.']];
const nearby: [string, string, IconName][] = [['Schools', '1.2 km', 'school-outline'], ['Hospitals', '1.8 km', 'medkit-outline'], ['Shopping Malls', '2.1 km', 'cart-outline'], ['Metro Station', '1.5 km', 'subway-outline'], ['IT Hubs', '3.2 km', 'laptop-outline']];

export function ApartmentDetailsScreen({ navigation, route }: RootScreenProps<'ApartmentDetails'>) {
  const [more, setMore] = useState(false);
  return (
    <Screen
      footer={
        <View style={styles.row}>
          <Button variant="outline" icon="call-outline" label="Call Now" style={styles.flex} />
          <Button label="Enquire Now" style={styles.flex} onPress={() => navigation.navigate('ScheduleVisit', { id: route.params.id })} />
        </View>
      }>
      <Header title="2 BHK Apartment" subtitle="Skyline Heights, Kondapur, Hyderabad" right={<View style={styles.row}><IconButton name="heart-outline" accessibilityLabel="Save" /><IconButton name="share-outline" accessibilityLabel="Share" /></View>} />
      <PropertyPhoto icon="bed" tone={1} label="1 / 18" style={styles.hero} />
      <View style={styles.priceRow}>
        <View style={styles.flex}>
          <Text style={styles.price}>₹ 1.25 Cr*</Text>
          <Text style={typography.muted}>Onwards</Text>
        </View>
        <View style={styles.flex}>
          <Button label="Get Best Price" small />
          <View style={styles.sp} />
          <Button label="Schedule Visit" variant="outline" small icon="calendar-outline" onPress={() => navigation.navigate('ScheduleVisit', { id: route.params.id })} />
        </View>
      </View>

      <Card style={styles.card}>
        <View style={styles.spread}>
          {specs.map(s => (
            <View key={s.l} style={styles.spec}>
              <Icon name={s.icon} size={18} color={colors.textMuted} />
              <Text style={typography.h3}>{s.v}</Text>
              <Text style={typography.tiny}>{s.l}</Text>
            </View>
          ))}
        </View>
      </Card>

      <SectionTitle title="About Apartment" />
      <Text style={[typography.muted, styles.pad]} numberOfLines={more ? undefined : 3}>
        This 2 BHK apartment is thoughtfully designed to offer you the perfect blend of comfort, style and functionality. Spacious living areas, ample natural light and premium fittings make it an ideal choice for your family.
      </Text>
      <Text style={styles.link} onPress={() => setMore(m => !m)}>{more ? 'Read Less' : 'Read More'}</Text>

      <SectionTitle title="Highlights" />
      <View style={[styles.wrap, styles.pad]}>{highlights.map(h => <Tag key={h} label={h} />)}</View>

      <SectionTitle title="Floor Plan" action="View Full Plan" />
      <Card style={styles.card}>
        <View style={styles.row}>
          <PropertyPhoto icon="map-outline" tone={4} style={styles.plan} />
          <View style={styles.flex}>
            <Text style={typography.h3}>2 BHK Apartment</Text>
            {plan.map(([k, v]) => (
              <View key={k} style={styles.spread}>
                <Text style={typography.muted}>{k}</Text>
                <Text style={typography.body}>{v}</Text>
              </View>
            ))}
            <Button small variant="soft" icon="download-outline" label="Download Plan" style={styles.sp} />
          </View>
        </View>
      </Card>

      <SectionTitle title="Nearby Places" />
      <View style={[styles.spread, styles.pad]}>
        {nearby.map(([n, d, i]) => (
          <View key={n} style={styles.spec}>
            <Icon name={i} size={20} />
            <Text style={typography.tiny}>{n}</Text>
            <Text style={typography.tiny}>{d}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: 8 },
  spread: { flexDirection: 'row', justifyContent: 'space-between' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pad: { paddingHorizontal: 16 },
  sp: { height: 8 },
  hero: { height: 190, marginHorizontal: 16, borderRadius: 16 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 14 },
  price: { fontSize: 22, fontWeight: '700', color: colors.primary },
  card: { marginHorizontal: 16, marginTop: 12 },
  spec: { alignItems: 'center', flex: 1, gap: 2 },
  link: { color: colors.primary, fontSize: 12, fontWeight: '600', paddingHorizontal: 16, paddingTop: 4 },
  plan: { width: 120, height: 110 },
});
