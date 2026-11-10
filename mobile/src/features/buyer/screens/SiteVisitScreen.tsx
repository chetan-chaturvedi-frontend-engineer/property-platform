import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button, Header, IconButton, PropertyPhoto, Screen, SectionTitle, Tag, TextField } from '../../../components';
import { RootScreenProps } from '../../../navigation/types';
import { typography } from '../../../theme';
import { DateStrip } from '../components/DateStrip';
import { InfoBanner } from '../components/InfoBanner';
import { TimeSlotGrid } from '../components/TimeSlotGrid';
import { useProperty } from '../hooks/useProperties';
import { TIME_SLOTS, useScheduleVisit } from '../hooks/useScheduleVisit';

export function SiteVisitScreen({ navigation, route }: RootScreenProps<'SiteVisit'>) {
  const { id } = route.params;
  const { data: p } = useProperty(id);
  const f = useScheduleVisit(id);

  async function confirm() {
    if (await f.submit()) {
      Alert.alert('Site visit confirmed', 'You will receive a confirmation call shortly.', [{ text: 'OK', onPress: () => navigation.popToTop() }]);
    } else {
      Alert.alert('Check your details', 'Enter a name, 10-digit mobile number and a valid email.');
    }
  }

  return (
    <Screen footer={<Button icon="calendar-outline" label="Confirm Site Visit" onPress={confirm} />}>
      <Header title="Schedule Site Visit" subtitle="Book a free site visit and explore your future home" right={<IconButton name="help-circle-outline" accessibilityLabel="Help" />} />
      <View style={styles.hero}>
        <PropertyPhoto tone={p?.tone ?? 0} style={styles.photo} label="12 Photos" />
        <View style={styles.flex}>
          <Text style={typography.h2}>{p?.name}</Text>
          <Text style={typography.muted}>{p?.area}</Text>
          <Text style={typography.muted}>{p?.config}</Text>
          <View style={styles.tags}><Tag label={p?.sqft ?? ''} /><Tag label={`Possession ${p?.possession}`} tone="success" /></View>
        </View>
      </View>
      <InfoBanner icon="shield-checkmark-outline" title="100% Free Visit" body="No charges, no obligations. Get expert guidance and personalized assistance." />
      <SectionTitle title="Select Date & Time" />
      <DateStrip selected={f.dayIndex} onSelect={f.setDayIndex} />
      <View style={styles.gap} />
      <TimeSlotGrid slots={TIME_SLOTS.slice(0, 7)} selected={f.time} onSelect={f.setTime} />
      <SectionTitle title="Your Details" />
      <View style={styles.form}>
        <TextField icon="person-outline" placeholder="Full Name" value={f.fullName} onChangeText={f.setFullName} />
        <TextField icon="call-outline" placeholder="Phone Number" keyboardType="phone-pad" maxLength={10} value={f.mobile} onChangeText={f.setMobile} />
        <TextField icon="mail-outline" placeholder="Email Address" autoCapitalize="none" keyboardType="email-address" value={f.email} onChangeText={f.setEmail} />
        <TextField icon="create-outline" placeholder="Additional Notes (Optional)" multiline value={f.notes} onChangeText={f.setNotes} />
      </View>
      <InfoBanner tone="success" icon="gift-outline" title="Special Offer!" body="Visit the site and get exclusive offers & early bird benefits." />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { flexDirection: 'row', gap: 12, paddingHorizontal: 16 },
  photo: { width: 120, height: 120 },
  tags: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  gap: { height: 10 },
  form: { gap: 10, paddingHorizontal: 16 },
});
