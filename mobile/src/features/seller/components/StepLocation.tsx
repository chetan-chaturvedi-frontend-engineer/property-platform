import React from 'react';
import { FormField } from '../../../components';
import { Coordinate, PropertyDraft } from '../../../types';
import { LocationPinPicker } from './LocationPinPicker';

interface Props {
  draft: PropertyDraft;
  update: <K extends keyof PropertyDraft>(key: K, value: PropertyDraft[K]) => void;
}

/** Wizard step 3: where the property is. */
export function StepLocation({ draft: d, update }: Props) {
  const setPin = (pin: Coordinate | undefined) => {
    update('latitude', pin?.latitude);
    update('longitude', pin?.longitude);
  };
  return (
    <>
      <FormField label="Address" icon="location-outline" value={d.address} onChangeText={v => update('address', v)} placeholder="Plot / building, street" />
      <FormField label="Locality" icon="navigate-outline" value={d.locality} onChangeText={v => update('locality', v)} placeholder="e.g. Kondapur" />
      <FormField label="City" icon="business-outline" value={d.city} onChangeText={v => update('city', v)} />
      <FormField label="State" icon="map-outline" value={d.state} onChangeText={v => update('state', v)} />
      <FormField label="PIN code" icon="pin-outline" value={d.pincode} onChangeText={v => update('pincode', v)} keyboardType="number-pad" maxLength={6} />
      <LocationPinPicker draft={d} setPin={setPin} />
    </>
  );
}
