import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Chip, FormField } from '../../../components';
import { BHK_TYPES } from '../../../services/mappers/propertySearchMapper';
import { typography } from '../../../theme';
import { PropertyDraft } from '../../../types';

interface Props {
  draft: PropertyDraft;
  update: <K extends keyof PropertyDraft>(key: K, value: PropertyDraft[K]) => void;
}

/** Wizard step 2: the unit being sold (configuration, size, price). */
export function StepDetails({ draft: d, update }: Props) {
  return (
    <>
      <Text style={typography.h3}>Configuration</Text>
      <View style={styles.wrap}>{Object.keys(BHK_TYPES).map(b => <Chip key={b} label={b} active={d.bhk === b} onPress={() => update('bhk', b)} />)}</View>
      <FormField label="Built-up area (sq.ft.)" icon="resize-outline" value={d.areaSqft} onChangeText={v => update('areaSqft', v)} keyboardType="number-pad" maxLength={5} placeholder="e.g. 1200" />
      <FormField label="Bathrooms" icon="water-outline" value={d.bathrooms} onChangeText={v => update('bathrooms', v)} keyboardType="number-pad" maxLength={2} />
      <FormField label="Expected price (₹)" icon="cash-outline" value={d.price} onChangeText={v => update('price', v)} keyboardType="number-pad" maxLength={10} placeholder="e.g. 7500000" />
    </>
  );
}

const styles = StyleSheet.create({ wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } });
