import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, Header, Icon, Screen, StepIndicator, TextField } from '../../../components';
import { useRootNavigation } from '../../../navigation/useRootNavigation';
import { colors, typography } from '../../../theme';
import { mockAmenities } from '../../../services/mockData';
import { TOTAL_STEPS, useAddProperty } from '../hooks/useAddProperty';

const TITLES = ['Listing Type', 'Property Details', 'Location', 'Pricing', 'Amenities', 'Photos & Videos', 'Review & Publish'];
const TYPES = ['Apartment / Flat', 'Independent House', 'Villa', 'Plot / Land'];
const BHKS = ['1 BHK', '2 BHK', '3 BHK', '4+ BHK'];

export function AddPropertyScreen() {
  const nav = useRootNavigation();
  const f = useAddProperty();
  const d = f.draft;

  const onNext = () => {
    if (f.next()) {
      nav.navigate('PreviewListing');
    }
  };

  return (
    <Screen
      footer={
        <View style={styles.row}>
          {f.step > 1 ? <Button variant="outline" label="Back" style={styles.flex} onPress={f.back} /> : null}
          <Button label={f.step === TOTAL_STEPS ? 'Preview Listing' : 'Save & Continue'} style={styles.flex} onPress={onNext} />
        </View>
      }>
      <Header title="Add Property" subtitle={`Step ${f.step} of ${TOTAL_STEPS} • ${TITLES[f.step - 1]}`} />
      <StepIndicator total={TOTAL_STEPS} current={f.step} />
      <View style={styles.body}>
        {f.step === 1 && (
          <>
            <Text style={typography.h3}>I want to</Text>
            <View style={styles.wrap}>{(['Sell', 'Rent'] as const).map(p => <Chip key={p} label={p} active={d.purpose === p} onPress={() => f.update('purpose', p)} />)}</View>
            <Text style={typography.h3}>Property type</Text>
            <View style={styles.wrap}>{TYPES.map(t => <Chip key={t} label={t} active={d.type === t} onPress={() => f.update('type', t)} />)}</View>
          </>
        )}
        {f.step === 2 && (
          <>
            <Text style={typography.h3}>Bedrooms</Text>
            <View style={styles.wrap}>{BHKS.map(b => <Chip key={b} label={b} active={d.bhk === b} onPress={() => f.update('bhk', b)} />)}</View>
            <Text style={typography.h3}>Built-up area (sq.ft.)</Text>
            <TextField icon="resize-outline" placeholder="e.g. 1200" keyboardType="number-pad" maxLength={5} value={d.areaSqft} onChangeText={v => f.update('areaSqft', v)} />
          </>
        )}
        {f.step === 3 && (
          <>
            <Text style={typography.h3}>Locality</Text>
            <TextField icon="location-outline" placeholder="e.g. Kondapur" value={d.locality} onChangeText={v => f.update('locality', v)} />
            <Text style={typography.h3}>City</Text>
            <TextField icon="business-outline" value={d.city} onChangeText={v => f.update('city', v)} />
          </>
        )}
        {f.step === 4 && (
          <>
            <Text style={typography.h3}>Expected price (₹)</Text>
            <TextField icon="cash-outline" placeholder="e.g. 7500000" keyboardType="number-pad" maxLength={10} value={d.price} onChangeText={v => f.update('price', v)} />
            <View style={styles.wrap}><Chip label="Price negotiable" active={d.negotiable} onPress={() => f.update('negotiable', !d.negotiable)} /></View>
          </>
        )}
        {f.step === 5 && (
          <>
            <Text style={typography.muted}>Select amenities available in your property.</Text>
            <View style={styles.wrap}>{mockAmenities.map(a => <Chip key={a.label} label={a.label} active={d.amenities.includes(a.label)} onPress={() => f.toggleAmenity(a.label)} />)}</View>
          </>
        )}
        {f.step === 6 && (
          <Card style={styles.upload}>
            <Icon name="camera-outline" size={32} />
            <Text style={typography.h3}>Photos & Videos</Text>
            <Text style={[typography.muted, styles.center]}>Upload high-quality photos (max 15) and videos (max 3). Media upload is enabled once the image-picker permission flow is configured.</Text>
          </Card>
        )}
        {f.step === 7 && (
          <Card style={styles.gap}>
            {([['Listing', `${d.purpose} • ${d.type}`], ['Configuration', d.bhk], ['Area', `${d.areaSqft} sq.ft.`], ['Location', `${d.locality}, ${d.city}`], ['Price', `₹ ${d.price}${d.negotiable ? ' (Negotiable)' : ''}`], ['Amenities', `${d.amenities.length} selected`]] as const).map(([k, v]) => (
              <View key={k} style={styles.spread}><Text style={typography.muted}>{k}</Text><Text style={typography.h3}>{v}</Text></View>
            ))}
          </Card>
        )}
        {f.error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{f.error}</Text> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: 12 },
  body: { paddingHorizontal: 16, gap: 12, paddingTop: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  upload: { alignItems: 'center', gap: 8, padding: 24 },
  center: { textAlign: 'center' },
  gap: { gap: 10 },
  spread: { flexDirection: 'row', justifyContent: 'space-between' },
  error: { color: colors.danger, fontSize: 12 },
});
