import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '../../../components';
import { typography } from '../../../theme';
import { PropertyDraft } from '../../../types';
import { formatRupees } from '../../../utils/format';

/** Wizard step 7: what will be submitted for review. */
export function StepReview({ draft: d }: { draft: PropertyDraft }) {
  const rows: [string, string][] = [
    ['Property', `${d.projectName} • ${d.propertyType}`],
    ['Configuration', `${d.bhk}, ${d.areaSqft} sq.ft.`],
    ['Price', formatRupees(Number(d.price))],
    ['Location', `${d.locality}, ${d.city}`],
    ['Status', d.projectStatus],
    ['Amenities', `${d.amenityIds.length} selected`],
    ['Photos', `${d.photos.length} added`],
  ];
  return (
    <Card style={styles.card}>
      {rows.map(([k, v]) => (
        <View key={k} style={styles.spread}><Text style={typography.muted}>{k}</Text><Text style={[typography.h3, styles.value]}>{v}</Text></View>
      ))}
      <Text style={typography.tiny}>Submitting sends your property for review. It goes live once it is approved.</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  spread: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  value: { flexShrink: 1, textAlign: 'right' },
});
