import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import { Button, Icon } from '../../../components';
import { env } from '../../../config/env';
import { colors, radius, shadows, typography } from '../../../theme';
import { MapBounds, Property } from '../../../types';
import { DEFAULT_REGION, MapRegion, regionForCoordinates, regionToBounds } from '../../../utils/mapRegion';
import { MapPin } from './MapPin';

interface Props {
  /** Properties to draw; those without a coordinate are skipped. */
  properties: Property[];
  /** Properties the current search/filters match, used to frame the map when they change. */
  framing: Property[];
  selectedId: string | undefined;
  onSelect: (property: Property | undefined) => void;
  onBoundsChange: (bounds: MapBounds) => void;
  /** Shown over the map when nothing is in the visible area. */
  emptyMessage?: string;
  /** Drawn at the bottom of the map, e.g. the preview card of the selected pin. */
  children?: React.ReactNode;
}

const PIN_REDRAW_MS = 400;

/** Whether this build can draw a map: iOS always (Apple Maps), Android only with a Google Maps key. */
export const mapAvailable = Platform.OS !== 'android' || env.mapsAndroidEnabled;

/** Interactive map of price pins, or a short message when this build has no map. */
export function PropertyMap({ properties, framing, selectedId, onSelect, onBoundsChange, emptyMessage, children }: Props) {
  const ref = useRef<MapView>(null);
  const [tracking, setTracking] = useState(true);
  const pins = properties.filter(p => p.coordinate);

  // Custom pin views are bitmaps on Android: redraw while they change, then stop tracking for speed.
  const pinKey = `${pins.map(p => p.id).join(',')}|${selectedId ?? ''}`;
  useEffect(() => {
    setTracking(true);
    const timer = setTimeout(() => setTracking(false), PIN_REDRAW_MS);
    return () => clearTimeout(timer);
  }, [pinKey]);

  const framingKey = framing.filter(p => p.coordinate).map(p => p.id).join(',');
  const framingRef = useRef(framing);
  framingRef.current = framing;
  const [ready, setReady] = useState(false);
  const frame = useCallback(() => {
    const region = regionForCoordinates(framingRef.current.flatMap(p => (p.coordinate ? [p.coordinate] : [])));
    if (region) {
      ref.current?.animateToRegion(region, 400);
    }
  }, []);
  // Frame the results once the map is ready and whenever the search or filters produce a different set.
  useEffect(() => {
    if (ready) {
      frame();
    }
  }, [ready, framingKey, frame]);

  if (!mapAvailable) {
    return (
      <View style={[styles.map, styles.fallback]} accessibilityLabel="Map unavailable">
        <Icon name="map-outline" size={48} color={colors.border} />
        <Text style={[typography.h3, styles.center]}>Map unavailable in this build</Text>
        <Text style={[typography.muted, styles.center]}>Browse the matching properties in the list below.</Text>
      </View>
    );
  }
  return (
    <View style={styles.map}>
      <MapView
        ref={ref}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        initialRegion={DEFAULT_REGION}
        onRegionChangeComplete={(region: MapRegion) => onBoundsChange(regionToBounds(region))}
        onMapReady={() => setReady(true)}
        onPress={e => e.nativeEvent.action !== 'marker-press' && onSelect(undefined)}
        toolbarEnabled={false}
        rotateEnabled={false}
        accessibilityLabel="Map of properties">
        {pins.map(p => (
          <MapPin key={p.id} property={p} selected={p.id === selectedId} tracksViewChanges={tracking} onPress={onSelect} />
        ))}
      </MapView>
      {emptyMessage ? (
        <View style={styles.empty}>
          <Text style={[typography.body, styles.center]}>{emptyMessage}</Text>
          {framingKey ? <Button small variant="outline" label="Show all" onPress={frame} /> : null}
        </View>
      ) : null}
      {children ? <View style={styles.overlay} pointerEvents="box-none">{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, minHeight: 200, marginTop: 8, backgroundColor: colors.surface },
  fallback: { alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 32 },
  center: { textAlign: 'center' },
  overlay: { position: 'absolute', left: 0, right: 0, bottom: 24 },
  empty: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    maxWidth: '85%',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    ...shadows.card,
  },
});
