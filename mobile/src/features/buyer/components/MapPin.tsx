import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { colors, radius, shadows } from '../../../theme';
import { Property } from '../../../types';

interface Props {
  property: Property;
  selected: boolean;
  /** Android renders the custom view to a bitmap; keep tracking on until it has been drawn once. */
  tracksViewChanges: boolean;
  onPress: (property: Property) => void;
}

/** Price pin for one property; the selected one is filled with the brand color. */
export function MapPin({ property, selected, tracksViewChanges, onPress }: Props) {
  if (!property.coordinate) {
    return null;
  }
  return (
    <Marker
      coordinate={property.coordinate}
      onPress={e => {
        // Keep the map's own onPress (which clears the selection) from firing for the same tap.
        e.stopPropagation();
        onPress(property);
      }}
      tracksViewChanges={tracksViewChanges}
      anchor={{ x: 0.5, y: 1 }}
      zIndex={selected ? 2 : 1}
      accessibilityLabel={`${property.name}, ${property.pinLabel}`}>
      <View style={styles.wrap}>
        <View style={[styles.bubble, selected && styles.bubbleSelected]}>
          <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>{property.pinLabel}</Text>
        </View>
        <View style={[styles.tail, selected && styles.tailSelected]} />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingBottom: 2 },
  bubble: {
    backgroundColor: colors.background,
    borderColor: colors.primary,
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    ...shadows.card,
  },
  bubbleSelected: { backgroundColor: colors.primary },
  label: { fontSize: 12, color: colors.primary, fontWeight: '700' },
  labelSelected: { color: colors.textInverse },
  tail: {
    width: 8,
    height: 8,
    marginTop: -5,
    backgroundColor: colors.background,
    borderColor: colors.primary,
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    transform: [{ rotate: '45deg' }],
  },
  tailSelected: { backgroundColor: colors.primary },
});
