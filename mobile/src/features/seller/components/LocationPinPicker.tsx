import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import { Button } from '../../../components';
import { geocodingService } from '../../../services/geocodingService';
import { colors, radius, typography } from '../../../theme';
import { Coordinate, PropertyDraft } from '../../../types';
import { DEFAULT_REGION } from '../../../utils/mapRegion';
import { mapAvailable } from '../../buyer/components/PropertyMap';

interface Props {
  draft: PropertyDraft;
  setPin: (pin: Coordinate | undefined) => void;
}

const PIN_ZOOM = 0.01;

/** Lets the seller place the listing on the map: look it up from the address, then tap or drag to adjust. */
export function LocationPinPicker({ draft: d, setPin }: Props) {
  const ref = useRef<MapView>(null);
  const [looking, setLooking] = useState(false);
  const [message, setMessage] = useState<string>();
  const pin: Coordinate | undefined =
    d.latitude !== undefined && d.longitude !== undefined ? { latitude: d.latitude, longitude: d.longitude } : undefined;

  useEffect(() => {
    if (pin) {
      ref.current?.animateToRegion({ ...pin, latitudeDelta: PIN_ZOOM, longitudeDelta: PIN_ZOOM }, 300);
    }
    // Only recentre when the pin itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin?.latitude, pin?.longitude]);

  const find = async () => {
    setLooking(true);
    setMessage(undefined);
    const found = await geocodingService.lookup(d);
    setLooking(false);
    if (found) {
      setPin(found);
      setMessage(mapAvailable ? 'Pin placed from the address. Drag it or tap the map to adjust.' : 'Pin placed from the address.');
    } else {
      setMessage(mapAvailable ? 'Could not find that address. Tap the map to place the pin.' : 'Could not find that address.');
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={typography.h3}>Pin on map</Text>
      <Text style={typography.muted}>Buyers find your listing on the Search map by this pin. It is optional.</Text>
      {mapAvailable ? (
        <View style={styles.map}>
          <MapView
            ref={ref}
            style={StyleSheet.absoluteFill}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
            initialRegion={pin ? { ...pin, latitudeDelta: PIN_ZOOM, longitudeDelta: PIN_ZOOM } : DEFAULT_REGION}
            onPress={e => setPin(e.nativeEvent.coordinate)}
            toolbarEnabled={false}
            rotateEnabled={false}
            accessibilityLabel="Map to place the property pin">
            {pin ? (
              <Marker coordinate={pin} draggable pinColor={colors.primary} onDragEnd={e => setPin(e.nativeEvent.coordinate)} />
            ) : null}
          </MapView>
        </View>
      ) : null}
      <View style={styles.actions}>
        <Button small variant="outline" icon="locate-outline" label={looking ? 'Looking up…' : 'Find from address'} disabled={looking} onPress={find} style={styles.flex} />
        {pin ? <Button small variant="soft" label="Remove pin" onPress={() => { setPin(undefined); setMessage(undefined); }} /> : null}
      </View>
      {message ? <Text style={typography.muted}>{message}</Text> : null}
      {pin ? <Text style={typography.tiny}>{pin.latitude.toFixed(5)}, {pin.longitude.toFixed(5)}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, marginTop: 8 },
  flex: { flex: 1 },
  map: { height: 220, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface },
  actions: { flexDirection: 'row', gap: 8 },
});
