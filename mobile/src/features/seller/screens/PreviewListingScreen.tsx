import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, Header, Icon, PropertyPhoto, Screen, SectionTitle, Tag } from '../../../components';
import { useRootNavigation } from '../../../navigation/useRootNavigation';
import { colors, typography } from '../../../theme';

export function PreviewListingScreen() {
  const nav = useRootNavigation();
  return (
    <Screen
      footer={
        <View style={styles.row}>
          <Button variant="outline" label="Back" style={styles.flex} onPress={nav.goBack} />
          <Button icon="checkmark-circle-outline" label="Publish Property" style={styles.flex} onPress={() => nav.navigate('Published')} />
        </View>
      }>
      <Header title="Preview Listing" subtitle="Step 7 of 7" />
      <View style={styles.banner}>
        <Icon name="checkmark-circle" size={20} color={colors.success} />
        <Text style={typography.muted}>Almost Done! Please review your property details before final publishing.</Text>
      </View>
      <Card style={styles.card}>
        <View style={styles.row}>
          <PropertyPhoto tone={1} style={styles.photo} />
          <View style={styles.flex}>
            <Text style={typography.h3}>2 BHK Apartment, Hyderabad</Text>
            <Tag label="For Sale" tone="success" />
            <Text style={typography.muted}>Built-up Area: 1200 sq.ft.</Text>
          </View>
        </View>
      </Card>
      <SectionTitle title="Pricing Details" />
      <Card style={styles.card}>
        <View style={styles.spread}><Text style={typography.muted}>Expected Price</Text><Text style={typography.h3}>₹ 75,00,000</Text></View>
        <View style={styles.spread}><Text style={typography.muted}>Price Negotiable</Text><Text style={typography.h3}>Yes</Text></View>
      </Card>
      <View style={styles.banner}>
        <Icon name="information-circle-outline" size={20} />
        <Text style={typography.muted}>Once published, your property will be live and visible to all buyers.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: 12 },
  card: { marginHorizontal: 16, gap: 8 },
  photo: { width: 90, height: 80 },
  spread: { flexDirection: 'row', justifyContent: 'space-between' },
  banner: { flexDirection: 'row', gap: 8, alignItems: 'center', margin: 16, padding: 12, borderRadius: 12, backgroundColor: colors.primaryTint },
});
