import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, Header, Icon, Screen, SectionTitle, StepIndicator, Tag } from '../../../components';
import { useRootNavigation } from '../../../navigation/useRootNavigation';
import { colors, typography } from '../../../theme';

const docs = [
  { id: 'aadhaar', title: 'Aadhaar Card', sub: 'UIDAI issued Aadhaar Card', required: true },
  { id: 'pan', title: 'PAN Card', sub: 'Permanent Account Number', required: true },
  { id: 'dl', title: 'Driving License', sub: 'Government issued Driving License', required: false },
];

export function SellerVerificationScreen() {
  const nav = useRootNavigation();
  const [uploaded, setUploaded] = useState<string[]>([]);
  const canContinue = uploaded.includes('aadhaar') || uploaded.includes('pan');

  return (
    <Screen footer={<Button label="Continue to Payment" icon="arrow-forward" onPress={() => nav.reset({ index: 0, routes: [{ name: 'SellerTabs' }] })} />}>
      <Header title="Individual Seller Verification" subtitle="Step 3 of 4" />
      <StepIndicator total={4} current={3} />
      <Card style={styles.card}><Text style={typography.muted}>Upload any one or more documents to verify your identity.</Text></Card>
      <SectionTitle title="Upload Documents" />
      {docs.map(d => {
        const done = uploaded.includes(d.id);
        return (
          <Card key={d.id} style={styles.doc}>
            <View style={styles.flex}>
              <View style={styles.row}><Text style={typography.h3}>{d.title}</Text><Tag label={d.required ? 'Required' : 'Optional'} tone={d.required ? 'danger' : 'primary'} /></View>
              <Text style={typography.muted}>{d.sub}</Text>
            </View>
            <Button small variant={done ? 'soft' : 'outline'} icon={done ? 'checkmark' : 'cloud-upload-outline'} label={done ? 'Added' : 'Upload'} onPress={() => setUploaded(u => (u.includes(d.id) ? u : [...u, d.id]))} />
          </Card>
        );
      })}
      <SectionTitle title="Important Notes" />
      <Card style={styles.card}>
        {['At least one document is mandatory (Aadhaar or PAN)', 'All documents must be clear and valid', 'Details will be verified within 24–48 hours'].map(t => (
          <View key={t} style={styles.row}><Icon name="checkmark-circle-outline" size={14} /><Text style={typography.muted}>{t}</Text></View>
        ))}
      </Card>
      <Card style={styles.fee}>
        <Text style={typography.h3}>Registration Fee</Text>
        <Text style={styles.price}>₹ 999</Text>
      </Card>
      {!canContinue ? <Text style={styles.hint}>Upload Aadhaar or PAN to enable verification.</Text> : null}
      <Text style={styles.hint}>Document upload and payment are connected to the backend / store billing in a later release.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  card: { marginHorizontal: 16, gap: 6 },
  doc: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginBottom: 10 },
  fee: { flexDirection: 'row', justifyContent: 'space-between', margin: 16 },
  price: { fontSize: 18, fontWeight: '700', color: colors.primary },
  hint: { ...typography.tiny, paddingHorizontal: 16, marginBottom: 6 },
});
