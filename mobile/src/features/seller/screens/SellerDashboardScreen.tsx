import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, Icon, PropertyPhoto, Screen, SectionTitle, StatTile, Tag } from '../../../components';
import { useRootNavigation } from '../../../navigation/useRootNavigation';
import { colors, typography } from '../../../theme';
import { useSellerListings } from '../hooks/useSeller';

export function SellerDashboardScreen() {
  const nav = useRootNavigation();
  const { data } = useSellerListings();
  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={typography.h1}>Welcome,{'\n'}Property Seller!</Text>
        <Text style={typography.muted}>List your properties, reach genuine buyers and grow your business.</Text>
        <Button icon="add" label="Add New Property" style={styles.cta} onPress={() => nav.navigate('AddProperty')} />
      </View>
      <Card style={styles.verify}>
        <Icon name="shield-checkmark-outline" size={26} />
        <View style={styles.flex}>
          <Text style={typography.h3}>Complete Your Verification</Text>
          <Text style={typography.tiny}>Get verified to build trust and unlock all seller features.</Text>
        </View>
        <Button small variant="outline" label="Verify Now" onPress={() => nav.navigate('SellerVerification')} />
      </Card>

      <SectionTitle title="Overview" />
      <View style={styles.stats}>
        <StatTile icon="business-outline" value="08" label="Properties" trend="Active" />
        <StatTile icon="eye-outline" value="1,248" label="Views" trend="+18%" />
        <StatTile icon="person-outline" value="46" label="Leads" trend="+12%" />
      </View>
      <View style={[styles.stats, styles.top]}>
        <StatTile icon="chatbubble-outline" value="23" label="Chats" trend="+10%" />
        <StatTile icon="calendar-outline" value="12" label="Site Visits" trend="+8%" />
        <View style={styles.flex} />
      </View>

      <SectionTitle title="Quick Actions" />
      <View style={styles.stats}>
        {([['add-circle-outline', 'Add Property', 'AddProperty'], ['business-outline', 'My Properties', null], ['people-outline', 'Leads', null], ['analytics-outline', 'Analytics', 'PropertyPerformance']] as const).map(([i, l, to]) => (
          <Card key={l} style={styles.qa}>
            <Icon name={i} size={20} />
            <Text style={typography.tiny} onPress={() => to === 'AddProperty' ? nav.navigate('AddProperty') : to === 'PropertyPerformance' ? nav.navigate('PropertyPerformance', { id: 's1' }) : undefined}>{l}</Text>
          </Card>
        ))}
      </View>

      <Card style={styles.upgrade}>
        <Text style={[typography.h3, { color: colors.textInverse }]}>Grow Your Business</Text>
        <Text style={[typography.muted, { color: colors.overlayLight }]}>Upgrade your plan to get more visibility and priority support.</Text>
        <Button small variant="outline" label="Upgrade Plan" style={styles.up} />
      </Card>

      <SectionTitle title="Recent Inquiries" action="View All" />
      {(data ?? []).slice(0, 2).map((l, i) => (
        <Card key={l.id} style={styles.inq}>
          <PropertyPhoto tone={i} style={styles.photo} />
          <View style={styles.flex}><Text style={typography.h3}>{l.title}</Text><Text style={typography.muted}>{l.area}</Text></View>
          <Tag label="New" tone="primary" />
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { padding: 16, gap: 6, backgroundColor: colors.primaryTint },
  cta: { alignSelf: 'flex-start', marginTop: 8 },
  verify: { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 16 },
  stats: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  top: { marginTop: 8 },
  qa: { flex: 1, alignItems: 'center', gap: 4, padding: 10 },
  upgrade: { marginHorizontal: 16, marginTop: 16, backgroundColor: colors.dark, gap: 6 },
  up: { alignSelf: 'flex-start', backgroundColor: colors.background },
  inq: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginBottom: 10, padding: 10 },
  photo: { width: 56, height: 48 },
});
