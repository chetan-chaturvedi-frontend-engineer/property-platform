import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Header, Icon, PropertyPhoto, Screen, SectionTitle, TextField } from '../../../components';
import type { IconName } from '../../../components';
import { RootScreenProps } from '../../../navigation/types';
import { colors, radius, typography } from '../../../theme';
import { VisitType } from '../../../types';
import { DateStrip } from '../components/DateStrip';
import { InfoBanner } from '../components/InfoBanner';
import { TimeSlotGrid } from '../components/TimeSlotGrid';
import { useProperty } from '../hooks/useProperties';
import { TIME_SLOTS, useScheduleVisit } from '../hooks/useScheduleVisit';

const types: { type: VisitType; icon: IconName; sub: string }[] = [
  { type: 'Site Visit', icon: 'person-outline', sub: 'Visit project site with our expert' },
  { type: 'Video Call', icon: 'videocam-outline', sub: 'Talk to our expert via video call' },
  { type: 'Virtual Tour', icon: 'cube-outline', sub: 'Explore project virtually in 360°' },
];

export function ScheduleVisitScreen({ navigation, route }: RootScreenProps<'ScheduleVisit'>) {
  const { id } = route.params;
  const { data: p } = useProperty(id);
  const f = useScheduleVisit(p);

  async function confirm() {
    const result = await f.submit();
    if (result.outcome === 'booked') {
      Alert.alert('Visit scheduled', `Your booking ID is ${result.bookingId}.`, [{ text: 'OK', onPress: () => navigation.navigate('Bookings') }]);
    } else if (result.outcome === 'needsLogin') {
      navigation.navigate('Login');
    } else {
      Alert.alert(result.outcome === 'invalid' ? 'Check your details' : 'Could not book the visit', result.message);
    }
  }

  return (
    <Screen footer={<Button label={f.submitting ? 'Booking…' : 'Confirm Visit'} onPress={confirm} disabled={f.submitting} />}>
      <Header title="Schedule Visit" />
      <Card style={styles.card}>
        <View style={styles.row}>
          <PropertyPhoto tone={p?.tone ?? 0} uri={p?.coverUrl} style={styles.photo} />
          <View style={styles.flex}>
            <Text style={typography.h3}>{p?.name}</Text>
            <Text style={typography.muted}>{p?.config}</Text>
            <Text style={typography.muted}>{p?.area}</Text>
          </View>
          <Text style={styles.price}>{p?.price}</Text>
        </View>
      </Card>

      <SectionTitle title="Select Visit Type" />
      <View style={[styles.row, styles.pad]}>
        {types.map(t => {
          const active = f.type === t.type;
          return (
            <Pressable key={t.type} accessibilityRole="radio" accessibilityState={{ selected: active }} onPress={() => f.setType(t.type)} style={[styles.type, active && styles.typeActive]}>
              <Icon name={t.icon} size={22} />
              <Text style={typography.h3}>{t.type}</Text>
              <Text style={typography.tiny}>{t.sub}</Text>
            </Pressable>
          );
        })}
      </View>

      <SectionTitle title="Select Date" />
      <DateStrip days={f.days} selected={f.dayIndex} onSelect={f.setDayIndex} />
      <SectionTitle title="Select Time Slot" />
      <TimeSlotGrid slots={TIME_SLOTS} selected={f.time} onSelect={f.setTime} />

      <SectionTitle title="Your Details" />
      <View style={[styles.gap, styles.pad]}>
        <TextField icon="person-outline" placeholder="Full Name" value={f.fullName} onChangeText={f.setFullName} />
        <TextField icon="call-outline" placeholder="Mobile Number" keyboardType="phone-pad" maxLength={10} value={f.mobile} onChangeText={f.setMobile} />
        <TextField icon="mail-outline" placeholder="Email Address" keyboardType="email-address" autoCapitalize="none" value={f.email} onChangeText={f.setEmail} />
        <TextField icon="create-outline" placeholder="Additional Notes (Optional)" multiline value={f.notes} onChangeText={f.setNotes} />
      </View>
      <InfoBanner icon="shield-checkmark-outline" title="Your information is secure with us" body="We respect your privacy and will never share your details." />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  pad: { paddingHorizontal: 16 },
  gap: { gap: 10 },
  card: { marginHorizontal: 16 },
  photo: { width: 64, height: 56 },
  price: { color: colors.primary, fontWeight: '700' },
  type: { flex: 1, gap: 4, padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  typeActive: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
});
