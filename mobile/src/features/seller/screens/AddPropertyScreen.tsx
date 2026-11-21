import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Header, Screen, StepIndicator } from '../../../components';
import { useRootNavigation } from '../../../navigation/useRootNavigation';
import { colors } from '../../../theme';
import { StepAbout } from '../components/StepAbout';
import { StepAmenities } from '../components/StepAmenities';
import { StepDetails } from '../components/StepDetails';
import { StepListing } from '../components/StepListing';
import { StepLocation } from '../components/StepLocation';
import { StepPhotos } from '../components/StepPhotos';
import { StepReview } from '../components/StepReview';
import { STEP_TITLES, TOTAL_STEPS, useAddProperty } from '../hooks/useAddProperty';

export function AddPropertyScreen() {
  const nav = useRootNavigation();
  const f = useAddProperty();
  const d = f.draft;

  async function onNext() {
    const outcome = await f.next();
    if (outcome === 'submitted') {
      nav.replace('Published');
    } else if (outcome === 'needsSubscription') {
      nav.navigate('SellerRegistration');
    }
  }

  const label = f.saving ? 'Saving…' : f.step === TOTAL_STEPS ? 'Submit for Review' : 'Save & Continue';

  return (
    <Screen
      footer={
        <View style={styles.row}>
          {f.step > 1 ? <Button variant="outline" label="Back" style={styles.flex} onPress={f.back} disabled={f.saving} /> : null}
          <Button label={label} style={styles.flex} onPress={onNext} disabled={f.saving} />
        </View>
      }>
      <Header title="Add Property" subtitle={`Step ${f.step} of ${TOTAL_STEPS} • ${STEP_TITLES[f.step - 1]}`} />
      <StepIndicator total={TOTAL_STEPS} current={f.step} />
      <View style={styles.body}>
        {f.step === 1 && <StepListing draft={d} update={f.update} />}
        {f.step === 2 && <StepDetails draft={d} update={f.update} />}
        {f.step === 3 && <StepLocation draft={d} update={f.update} />}
        {f.step === 4 && <StepAbout draft={d} update={f.update} />}
        {f.step === 5 && <StepAmenities selected={d.amenityIds} onToggle={f.toggleAmenity} />}
        {f.step === 6 && <StepPhotos photos={d.photos} onAdd={f.addPhotos} onRemove={f.removePhoto} />}
        {f.step === 7 && <StepReview draft={d} />}
        {f.error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{f.error}</Text> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: 12 },
  body: { paddingHorizontal: 16, gap: 14, paddingTop: 8 },
  error: { color: colors.danger, fontSize: 12 },
});
