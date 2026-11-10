import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, Header, Icon, IconButton, PropertyPhoto, Screen, SectionTitle } from '../../../components';
import type { IconName } from '../../../components';
import { RootScreenProps } from '../../../navigation/types';
import { colors, typography } from '../../../theme';
import { useProperty } from '../hooks/useProperties';

const rooms = ['Living Room', 'Kitchen', 'Master Bedroom', 'Kids Bedroom', 'Balcony'];
const about: [string, string][] = [['Configuration', '3 BHK Apartment'], ['Super Built-up Area', '1650 sq.ft.'], ['Carpet Area', '1125 sq.ft.'], ['Floors', 'G + 18 Floors'], ['Possession', 'Dec 2026'], ['RERA ID', 'P02400003628']];
const highlights: [IconName, string][] = [['walk-outline', 'Real 3D Walkthrough'], ['camera-outline', 'Actual Site Captures'], ['sunny-outline', 'Day & Night Views'], ['glasses-outline', 'Virtual Reality Ready']];

export function VirtualTourScreen({ navigation, route }: RootScreenProps<'VirtualTour'>) {
  const { data: p } = useProperty(route.params.id);
  const [room, setRoom] = useState(rooms[0]);
  return (
    <Screen footer={<Button icon="calendar-outline" label="Book Free Site Visit" onPress={() => navigation.navigate('SiteVisit', { id: route.params.id })} />}>
      <Header title="3D & Virtual Tour" subtitle="Explore your future home from anywhere" right={<IconButton name="share-outline" accessibilityLabel="Share" />} />
      <View style={styles.title}>
        <View style={styles.flex}>
          <Text style={typography.h3}>{p?.name}</Text>
          <Text style={typography.muted}>{p?.area}</Text>
        </View>
        <Button small variant="outline" label="Schedule Visit" onPress={() => navigation.navigate('ScheduleVisit', { id: route.params.id })} />
      </View>
      <View style={styles.tour}>
        <PropertyPhoto icon="bed" tone={1} style={styles.tourPhoto} label={room} />
        <View style={styles.play}><Icon name="play" size={28} color={colors.textInverse} /></View>
        <Text style={styles.start}>Start 3D Tour</Text>
      </View>
      <View style={styles.rooms}>
        {rooms.map(r => <Chip key={r} label={r} active={r === room} onPress={() => setRoom(r)} />)}
      </View>

      <SectionTitle title="About This Property" />
      <Card style={styles.card}>
        {about.map(([k, v]) => (
          <View key={k} style={styles.spread}><Text style={typography.muted}>{k}</Text><Text style={typography.h3}>{v}</Text></View>
        ))}
      </Card>

      <SectionTitle title="Tour Highlights" />
      <Card style={styles.card}>
        {highlights.map(([i, t]) => (
          <View key={t} style={styles.hl}><Icon name={i} size={18} /><Text style={typography.body}>{t}</Text></View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  tour: { marginHorizontal: 16, marginTop: 12, alignItems: 'center', justifyContent: 'center' },
  tourPhoto: { width: '100%', height: 220, borderRadius: 16 },
  play: { position: 'absolute', width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  start: { position: 'absolute', bottom: 16, color: colors.textInverse, fontWeight: '700' },
  rooms: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginTop: 12 },
  card: { marginHorizontal: 16, gap: 10 },
  spread: { flexDirection: 'row', justifyContent: 'space-between' },
  hl: { flexDirection: 'row', gap: 10, alignItems: 'center' },
});
