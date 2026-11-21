import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Chip, FormField } from '../../../components';
import { PROPERTY_TYPES } from '../../../services/mappers/propertySearchMapper';
import { typography } from '../../../theme';
import { PropertyDraft } from '../../../types';

interface Props {
  draft: PropertyDraft;
  update: <K extends keyof PropertyDraft>(key: K, value: PropertyDraft[K]) => void;
}

/** Wizard step 1: what is being listed and who to contact. */
export function StepListing({ draft: d, update }: Props) {
  return (
    <>
      <Text style={typography.h3}>Property type</Text>
      <View style={styles.wrap}>{Object.keys(PROPERTY_TYPES).map(t => <Chip key={t} label={t} active={d.propertyType === t} onPress={() => update('propertyType', t)} />)}</View>
      <FormField label="Property or project name" icon="business-outline" value={d.projectName} onChangeText={v => update('projectName', v)} placeholder="e.g. Sunrise Villas" />
      <FormField label="Builder or owner name" icon="person-outline" value={d.builderName} onChangeText={v => update('builderName', v)} autoCapitalize="words" />
      <FormField label="Contact email" icon="mail-outline" value={d.email} onChangeText={v => update('email', v)} autoCapitalize="none" keyboardType="email-address" />
      <FormField label="Contact mobile" icon="call-outline" value={d.phone} onChangeText={v => update('phone', v)} keyboardType="phone-pad" placeholder="10-digit number" />
    </>
  );
}

const styles = StyleSheet.create({ wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } });
