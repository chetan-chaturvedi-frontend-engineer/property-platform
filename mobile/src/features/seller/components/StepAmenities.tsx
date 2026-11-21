import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Chip, EmptyState } from '../../../components';
import { useAsync } from '../../../hooks/useAsync';
import { sellerPropertyService } from '../../../services/sellerPropertyService';
import { typography } from '../../../theme';

interface Props {
  selected: number[];
  onToggle: (id: number) => void;
}

/** Wizard step 5: amenities from the backend catalogue. */
export function StepAmenities({ selected, onToggle }: Props) {
  const { data, loading, error, reload } = useAsync(() => sellerPropertyService.amenityCatalog());
  return (
    <>
      <Text style={typography.muted}>Select the amenities available in your property.</Text>
      {error ? <EmptyState title="Could not load amenities" body={error.message} actionLabel="Retry" onAction={reload} /> : null}
      {loading && !data ? <EmptyState title="Loading…" /> : null}
      <View style={styles.wrap}>{(data ?? []).map(a => <Chip key={a.id} label={a.label} active={selected.includes(a.id)} onPress={() => onToggle(a.id)} />)}</View>
    </>
  );
}

const styles = StyleSheet.create({ wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } });
