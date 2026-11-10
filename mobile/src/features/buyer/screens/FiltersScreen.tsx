import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Chip, Header, Screen, Stepper } from '../../../components';
import { useRootNavigation } from '../../../navigation/useRootNavigation';
import { colors, typography } from '../../../theme';
import { FilterState, PossessionStatus } from '../../../types';
import { formatCompactPrice } from '../../../utils/format';

const TYPES = ['Apartment', 'Villa', 'Independent House', 'Plot / Land', 'Studio Apartment', 'Penthouse'];
const BHKS = ['1 BHK', '2 BHK', '3 BHK', '4+ BHK'];
const POSSESSION: PossessionStatus[] = ['Ready to Move', 'Under Construction', 'New Launch'];
const initial: FilterState = { budget: [5000000, 20000000], propertyType: 'Apartment', bhk: '3 BHK', possession: 'Ready to Move' };

export function FiltersScreen() {
  const nav = useRootNavigation();
  const [f, setF] = useState<FilterState>(initial);
  const section = (title: string) => <Text style={styles.section}>{title}</Text>;

  return (
    <Screen
      footer={
        <View style={styles.row}>
          <Button variant="soft" label="Reset" style={styles.flex} onPress={() => setF(initial)} />
          <Button label="Apply Filters" style={styles.flex} onPress={() => nav.goBack()} />
        </View>
      }>
      <Header title="Filter" subtitle="1,248 Properties Found" right={<Text style={styles.clear} onPress={() => setF(initial)}>Clear All</Text>} />
      <View style={styles.pad}>
        {section('Budget')}
        <Stepper label="Minimum" value={f.budget[0]} display={formatCompactPrice(f.budget[0])} step={500000} min={500000} max={f.budget[1] - 500000} onChange={v => setF({ ...f, budget: [v, f.budget[1]] })} />
        <Stepper label="Maximum" value={f.budget[1]} display={formatCompactPrice(f.budget[1])} step={500000} min={f.budget[0] + 500000} max={100000000} onChange={v => setF({ ...f, budget: [f.budget[0], v] })} />

        {section('Property Type')}
        <View style={styles.wrap}>{TYPES.map(t => <Chip key={t} label={t} active={f.propertyType === t} onPress={() => setF({ ...f, propertyType: t })} />)}</View>

        {section('BHK')}
        <View style={styles.wrap}>{BHKS.map(b => <Chip key={b} label={b} active={f.bhk === b} onPress={() => setF({ ...f, bhk: b })} />)}</View>

        {section('Possession Status')}
        <View style={styles.wrap}>{POSSESSION.map(p => <Chip key={p} label={p} active={f.possession === p} onPress={() => setF({ ...f, possession: f.possession === p ? null : p })} />)}</View>
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
