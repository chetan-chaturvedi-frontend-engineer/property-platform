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
  const f = useScheduleVisit(p);

  async function confirm() {
    const result = await f.submit();
    if (result.outcome === 'booked') {
      Alert.alert('Site visit confirmed', `Your booking ID is ${result.bookingId}.`, [{ text: 'OK', onPress: () => navigation.popToTop() }]);
    } else if (result.outcome === 'needsLogin') {
      navigation.navigate('Login');
    } else {
      Alert.alert(result.outcome === 'invalid' ? 'Check your details' : 'Could not book the visit', result.message);
    }
  }

  return (
    <Screen footer={<Button icon="calendar-outline" label={f.submitting ? 'Booking…' : 'Confirm Site Visit'} onPress={confirm} disabled={f.submitting} />}>
      <Header title="Schedule Site Visit" subtitle="Book a free site visit and explore your future home" right={<IconButton name="help-circle-outline" accessibilityLabel="Help" />} />
      <View style={styles.hero}>
        <PropertyPhoto tone={p?.tone ?? 0} uri={p?.coverUrl} style={styles.photo} label={p && p.photos > 0 ? `${p.photos} Photos` : undefined} />
        <View style={styles.flex}>
          <Text style={typography.h2}>{p?.name}</Text>
          <Text style={typography.muted}>{p?.area}</Text>
          <Text style={typography.muted}>{p?.config}</Text>
          <View style={styles.tags}>{p?.sqft ? <Tag label={p.sqft} /> : null}{p?.possession ? <Tag label={`Possession ${p.possession}`} tone="success" /> : null}</View>
        </View>
      </View>
      <InfoBanner icon="shield-checkmark-outline" title="100% Free Visit" body="No charges, no obligations. Get expert guidance and personalized assistance." />
      <SectionTitle title="Select Date & Time" />
      <DateStrip days={f.days} selected={f.dayIndex} onSelect={f.setDayIndex} />
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
