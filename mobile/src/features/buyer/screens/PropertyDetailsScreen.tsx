import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, Header, Icon, IconButton, PropertyPhoto, Screen, SectionTitle } from '../../../components';
import { RootScreenProps } from '../../../navigation/types';
import { colors, typography } from '../../../theme';
import { IconName } from '../../../components';
import { recentlyViewedService } from '../../../services/recentlyViewedService';
import { useAuth } from '../../auth/AuthProvider';
import { usePropertyAmenities, useProperty, useUnits } from '../hooks/useProperties';
import { useSavedProperties } from '../SavedPropertiesProvider';

const media: { icon: IconName; label: string }[] = [
  { icon: 'videocam', label: 'Live Tour' },
  { icon: 'cube-outline', label: '3D Tour' },
  { icon: 'image-outline', label: 'Photos' },
  { icon: 'play-circle-outline', label: 'Videos' },
];
const facts: { icon: IconName; value: string; label: string }[] = [
  { icon: 'resize-outline', value: '5 Acres', label: 'Project Area' },
  { icon: 'business-outline', value: '4 Towers', label: '2B + G + 20 Floors' },
  { icon: 'people-outline', value: '500+', label: 'Happy Families' },
  { icon: 'calendar-outline', value: 'Dec 2026', label: 'Possession' },
];
const filters = ['All', '2 BHK', '3 BHK', '4 BHK'];

export function PropertyDetailsScreen({ navigation, route }: RootScreenProps<'PropertyDetails'>) {
  const { id } = route.params;
  const { data: p } = useProperty(id);
  const { data: units } = useUnits(id);
  const { data: amenities } = usePropertyAmenities(id);
  const [filter, setFilter] = useState('All');
  const { status } = useAuth();
  const { isSaved, toggle } = useSavedProperties();
  const propertyId = p?.propertyId;
  const liked = propertyId !== undefined && isSaved(propertyId);

  // Opening a property counts as a view: it feeds Recently Viewed and the seller's view numbers.
  useEffect(() => {
    if (status === 'signedIn' && propertyId !== undefined) {
      recentlyViewedService.record(propertyId).catch(() => undefined);
    }
  }, [status, propertyId]);

  /** Enquiring starts a conversation with the owner, which needs an account. */
  function onEnquire() {
    if (!p) {
      return;
    }
    if (status === 'signedIn') {
      navigation.navigate('Chat', { propertyId: p.propertyId, title: p.name, subtitle: 'Ask the owner' });
    } else {
      navigation.navigate('Login');
    }
  }

  async function onToggleSaved() {
    if (propertyId !== undefined && (await toggle(propertyId)) === 'needsLogin') {
      navigation.navigate('Login');
    }
  }

  if (!p) {
    return <Screen><Header title="Loading…" /></Screen>;
  }
  const shown = (units ?? []).filter(u => filter === 'All' || u.name.startsWith(filter));

  return (
    <Screen
      footer={
        <View style={styles.footerRow}>
          <Button label="Schedule Visit" variant="outline" icon="calendar-outline" style={styles.flex} onPress={() => navigation.navigate('ScheduleVisit', { id })} />
          <Button label="Enquire Now" style={styles.flex} onPress={onEnquire} />
        </View>
      }>
      <Header
        title={p.name}
        subtitle={p.area}
        right={
          <View style={styles.row}>
            <IconButton name={liked ? 'heart' : 'heart-outline'} color={liked ? colors.danger : colors.text} accessibilityLabel={liked ? 'Remove from saved' : 'Save property'} onPress={onToggleSaved} />
            <IconButton name="share-outline" accessibilityLabel="Share" />
          </View>
        }
      />
      <PropertyPhoto tone={p.tone} uri={p.coverUrl} label={p.photos > 0 ? `${p.status}  •  1/${p.photos}` : p.status} style={styles.hero} />
      <Card style={styles.mediaCard}>
        <View style={styles.mediaRow}>
          {media.map(m => (
            <Pressable key={m.label} style={styles.mediaItem} onPress={() => m.label === '3D Tour' && navigation.navigate('VirtualTour', { id })} accessibilityRole="button">
              <Icon name={m.icon} size={20} />
              <Text style={typography.tiny}>{m.label}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <View style={styles.priceBar}>
        <View style={styles.flex}>
          <Text style={typography.h3}>{p.config}</Text>
          <Text style={typography.tiny}>Premium Residences</Text>
        </View>
        <Text style={styles.price}>{p.price}</Text>
      </View>

      <SectionTitle title="About Project" />
      <Text style={[typography.muted, styles.pad]}>
        {p.name} is a premium residential project offering spacious {p.config} with modern amenities and a lifestyle that befits your status.
      </Text>

      <Card style={styles.factsCard}>
        <View style={styles.mediaRow}>
          {facts.map(f => (
            <View key={f.label} style={styles.fact}>
              <Icon name={f.icon} size={20} />
              <Text style={typography.h3}>{f.value}</Text>
              <Text style={typography.tiny}>{f.label}</Text>
            </View>
          ))}
        </View>
      </Card>

      <SectionTitle title="Amenities" action="View All" />
      <View style={styles.grid}>
        {(amenities ?? []).map(a => (
          <View key={a.label} style={styles.amenity}>
            <Icon name={a.icon as IconName} size={22} color={colors.textMuted} />
            <Text style={[typography.tiny, styles.center]}>{a.label}</Text>
          </View>
        ))}
      </View>

      <SectionTitle title="Available Apartments" />
      <View style={[styles.row, styles.pad]}>
        {filters.map(f => <Chip key={f} label={f} active={filter === f} onPress={() => setFilter(f)} />)}
      </View>
      {shown.map(u => (
        <Pressable key={u.id} onPress={() => navigation.navigate('ApartmentDetails', { id: u.id })} accessibilityRole="button">
          <Card style={styles.unit}>
            <PropertyPhoto tone={2} icon="bed-outline" style={styles.unitPhoto} />
            <View style={styles.flex}>
              <Text style={typography.h3}>{u.name}</Text>
              <Text style={typography.muted}>{[u.sqft, u.facing].filter(Boolean).join('  •  ')}</Text>
              <Text style={styles.unitPrice}>{u.price} <Text style={typography.muted}>Onwards</Text></Text>
            </View>
            <Icon name="arrow-forward-circle" size={24} />
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: 8 },
  pad: { paddingHorizontal: 16 },
  center: { textAlign: 'center' },
  footerRow: { flexDirection: 'row', gap: 12 },
  hero: { height: 200, marginHorizontal: 16, borderRadius: 16 },
  mediaCard: { marginHorizontal: 28, marginTop: -26, padding: 10 },
  mediaRow: { flexDirection: 'row', justifyContent: 'space-around' },
  mediaItem: { alignItems: 'center', gap: 4, flex: 1 },
  priceBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: colors.primaryTint },
  price: { color: colors.primary, fontSize: 18, fontWeight: '700' },
  factsCard: { marginHorizontal: 16, marginTop: 12 },
  fact: { flex: 1, alignItems: 'center', gap: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  amenity: { width: '20%', alignItems: 'center', gap: 4, marginBottom: 14 },
  unit: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 10, padding: 10 },
  unitPhoto: { width: 64, height: 56 },
  unitPrice: { color: colors.primary, fontWeight: '700', fontSize: 13 },
});
