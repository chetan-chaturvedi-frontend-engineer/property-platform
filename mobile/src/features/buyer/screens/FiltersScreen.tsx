import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Chip, Header, Screen, Stepper, TextField } from '../../../components';
import { useAsync } from '../../../hooks/useAsync';
import { useRootNavigation } from '../../../navigation/useRootNavigation';
import { BHK_TYPES, EMPTY_FILTERS, POSSESSION_STATUS, PROPERTY_TYPES } from '../../../services/mappers/propertySearchMapper';
import { propertyService } from '../../../services/propertyService';
import { colors, typography } from '../../../theme';
import { FilterState, PossessionStatus } from '../../../types';
import { formatCompactPrice } from '../../../utils/format';
import { usePropertyFilters } from '../PropertyFiltersProvider';

const TYPES = Object.keys(PROPERTY_TYPES);
const BHKS = Object.keys(BHK_TYPES);
const POSSESSION = Object.keys(POSSESSION_STATUS) as PossessionStatus[];
const DEFAULT_BUDGET: [number, number] = [5000000, 20000000];
const STEP = 500000;

export function FiltersScreen() {
  const nav = useRootNavigation();
  const { filters, search, setFilters } = usePropertyFilters();
  const [f, setF] = useState<FilterState>(filters);
  const found = useAsync(() => propertyService.search(f, search), [JSON.stringify(f), search]);
  const section = (title: string) => <Text style={styles.section}>{title}</Text>;
  const toggle = <K extends 'propertyType' | 'bhk' | 'possession'>(key: K, value: FilterState[K]) =>
    setF({ ...f, [key]: f[key] === value ? null : value });

  function apply() {
    setFilters(f);
    nav.goBack();
  }

  return (
    <Screen
      footer={
        <View style={styles.row}>
          <Button variant="soft" label="Reset" style={styles.flex} onPress={() => setF(EMPTY_FILTERS)} />
          <Button label="Apply Filters" style={styles.flex} onPress={apply} />
        </View>
      }>
      <Header
        title="Filter"
        subtitle={found.data ? `${found.data.total} ${found.data.total === 1 ? 'Property' : 'Properties'} Found` : 'Searching…'}
        right={<Text style={styles.clear} onPress={() => setF(EMPTY_FILTERS)}>Clear All</Text>}
      />
      <View style={styles.pad}>
        {section('City')}
        <TextField icon="location-outline" placeholder="Any city" value={f.city} onChangeText={city => setF({ ...f, city })} />

        {section('Budget')}
        <View style={styles.wrap}>
          <Chip label="Any budget" active={f.budget === null} onPress={() => setF({ ...f, budget: null })} />
          <Chip label="Set range" active={f.budget !== null} onPress={() => setF({ ...f, budget: f.budget ?? DEFAULT_BUDGET })} />
        </View>
        {f.budget ? (
          <>
            <Stepper label="Minimum" value={f.budget[0]} display={formatCompactPrice(f.budget[0])} step={STEP} min={STEP} max={f.budget[1] - STEP} onChange={v => setF({ ...f, budget: [v, f.budget?.[1] ?? DEFAULT_BUDGET[1]] })} />
            <Stepper label="Maximum" value={f.budget[1]} display={formatCompactPrice(f.budget[1])} step={STEP} min={f.budget[0] + STEP} max={100000000} onChange={v => setF({ ...f, budget: [f.budget?.[0] ?? DEFAULT_BUDGET[0], v] })} />
          </>
        ) : null}

        {section('Property Type')}
        <View style={styles.wrap}>{TYPES.map(t => <Chip key={t} label={t} active={f.propertyType === t} onPress={() => toggle('propertyType', t)} />)}</View>

        {section('BHK')}
        <View style={styles.wrap}>{BHKS.map(b => <Chip key={b} label={b} active={f.bhk === b} onPress={() => toggle('bhk', b)} />)}</View>

        {section('Possession Status')}
        <View style={styles.wrap}>{POSSESSION.map(p => <Chip key={p} label={p} active={f.possession === p} onPress={() => toggle('possession', p)} />)}</View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: 12 },
  pad: { paddingHorizontal: 16 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  section: { ...typography.h3, marginTop: 20, marginBottom: 8 },
  clear: { color: colors.primary, fontWeight: '700' },
});
