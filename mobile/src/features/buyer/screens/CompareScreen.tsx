import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Header, Icon, IconButton, PropertyPhoto, Screen } from '../../../components';
import { useRootNavigation } from '../../../navigation/useRootNavigation';
import { colors, typography } from '../../../theme';
import { useCompare, useCompareAmenities } from '../hooks/useCompare';

const COL = 130;

export function CompareScreen() {
  const nav = useRootNavigation();
  const { selected, remove } = useCompare();
  const { data: amenities } = useCompareAmenities(selected);

  const rows: [string, (i: number) => string][] = [
    ['Price', i => `${selected[i].price} onwards`],
    ['Configuration', i => selected[i].config.replace(' Apartments', '')],
    ['Super Built-up', i => selected[i].sqft || '—'],
    ['Possession Date', i => selected[i].possession],
    ['Builder Rating', i => (selected[i].rating ? `★ ${selected[i].rating}` : '—')],
  ];

  return (
    <Screen>
      <Header title="Compare Properties" right={<IconButton name="share-outline" accessibilityLabel="Share" />} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View>
          <View style={styles.row}>
            <View style={styles.label} />
            {selected.map(p => (
              <View key={p.id} style={styles.col}>
                <PropertyPhoto tone={p.tone} uri={p.coverUrl} style={styles.photo} />
                <Pressable onPress={() => remove(p.id)} accessibilityRole="button" accessibilityLabel={`Remove ${p.name}`}>
                  <Text style={styles.remove}>Remove</Text>
                </Pressable>
                <Text style={typography.h3} numberOfLines={1}>{p.name}</Text>
                <Text style={typography.tiny} numberOfLines={1}>{p.area}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.section}>Overview</Text>
          {rows.map(([label, fn]) => (
            <View key={label} style={[styles.row, styles.line]}>
              <Text style={[typography.muted, styles.label]}>{label}</Text>
              {selected.map((p, i) => <Text key={p.id} style={[styles.cell, label === 'Price' && styles.price]}>{fn(i)}</Text>)}
            </View>
          ))}
          <Text style={styles.section}>Amenities</Text>
          {(amenities?.labels ?? []).slice(0, 8).map(label => (
            <View key={label} style={[styles.row, styles.line]}>
              <Text style={[typography.muted, styles.label]}>{label}</Text>
              {selected.map((p, i) => (
                <View key={p.id} style={styles.cellBox}>
                  {amenities?.has[i]?.has(label) ? <Icon name="checkmark-circle" size={18} color={colors.success} /> : <Text style={typography.muted}>–</Text>}
                </View>
              ))}
            </View>
          ))}
          <View style={[styles.row, styles.cta]}>
            <View style={styles.label} />
            {selected.map(p => (
              <View key={p.id} style={styles.col}>
                <Button small variant="outline" label="View Details" onPress={() => nav.navigate('PropertyDetails', { id: p.id })} />
                <View style={styles.sp} />
                <Button small label="Schedule Visit" onPress={() => nav.navigate('ScheduleVisit', { id: p.id })} />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      <Card style={styles.note}><Text style={typography.muted}>Compare up to 4 properties side by side.</Text></Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16 },
  row: { flexDirection: 'row' },
  line: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 10, alignItems: 'center' },
  label: { width: 96 },
  col: { width: COL, paddingRight: 8, gap: 4 },
  photo: { height: 84 },
  remove: { fontSize: 10, color: colors.danger, fontWeight: '600' },
  section: { ...typography.h3, marginTop: 16, marginBottom: 4 },
  cell: { width: COL, fontSize: 12, color: colors.text, textAlign: 'center' },
  price: { fontWeight: '700', color: colors.primary },
  cellBox: { width: COL, alignItems: 'center' },
  cta: { marginTop: 14 },
  sp: { height: 6 },
  note: { margin: 16 },
});
