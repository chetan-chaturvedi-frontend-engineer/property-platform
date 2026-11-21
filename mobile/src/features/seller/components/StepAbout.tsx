import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Chip, FormField } from '../../../components';
import { POSSESSION_STATUS } from '../../../services/mappers/propertySearchMapper';
import { typography } from '../../../theme';
import { PossessionStatus, PropertyDraft } from '../../../types';

interface Props {
  draft: PropertyDraft;
  update: <K extends keyof PropertyDraft>(key: K, value: PropertyDraft[K]) => void;
}

/** Wizard step 4: construction status and a description. */
export function StepAbout({ draft: d, update }: Props) {
  return (
    <>
      <Text style={typography.h3}>Possession status</Text>
      <View style={styles.wrap}>
        {(Object.keys(POSSESSION_STATUS) as PossessionStatus[]).map(p => (
          <Chip key={p} label={p} active={d.projectStatus === p} onPress={() => update('projectStatus', p)} />
        ))}
      </View>
      <FormField label="Description" icon="create-outline" value={d.description} onChangeText={v => update('description', v)} multiline maxLength={2000} placeholder="What makes this property special? (20+ characters)" />
    </>
  );
}

const styles = StyleSheet.create({ wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } });
