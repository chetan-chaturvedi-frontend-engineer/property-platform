import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, Icon, PropertyPhoto } from '../../../components';
import { useRootNavigation } from '../../../navigation/useRootNavigation';
import { colors, radius, typography } from '../../../theme';
import { Property } from '../../../types';
import { useSavedProperties } from '../SavedPropertiesProvider';

export const FEATURED_CARD_WIDTH = 260;

/** Compact vertical card for the Home "Featured Properties" strip: photo, verified badge, heart, key facts. */
export function FeaturedPropertyCard({ property: p }: { property: Property }) {
  const nav = useRootNavigation();
  const { isSaved, toggle } = useSavedProperties();
  const liked = isSaved(p.propertyId);
  const onToggleLike = async () => {
    if ((await toggle(p.propertyId)) === 'needsLogin') {
      nav.navigate('Login');
    }
  };
  return (
    <Card style={styles.card}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Open ${p.name}`} onPress={() => nav.navigate('PropertyDetails', { id: p.id })}>
        <View>
          <PropertyPhoto tone={p.tone} uri={p.coverUrl} label={p.photos > 0 ? `${p.photos} ${p.photos === 1 ? 'Photo' : 'Photos'}` : undefined} style={styles.photo} />
          <View style={styles.verified}>
            <Icon name="checkmark-circle" size={12} color={colors.success} />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
          <Pressable onPress={onToggleLike} accessibilityRole="button" accessibilityLabel={liked ? 'Remove from saved' : 'Save property'} hitSlop={8} style={styles.heart}>
            <Icon name={liked ? 'heart' : 'heart-outline'} size={16} color={liked ? colors.danger : colors.textMuted} />
          </Pressable>
        </View>
        <View style={styles.body}>
          <Text style={typography.h3} numberOfLines={1}>{p.name}</Text>
          <View style={styles.line}>
            <Icon name="location-outline" size={13} color={colors.textMuted} />
            <Text style={[typography.muted, styles.flex]} numberOfLines={1}>{p.area}</Text>
          </View>
          <Text style={styles.price}>{p.price}</Text>
          <View style={styles.line}>
            <Icon name="bed-outline" size={13} color={colors.textMuted} />
            <Text style={typography.muted} numberOfLines={1}>{p.config}</Text>
            {p.sqft ? <Text style={typography.muted}>· {p.sqft}</Text> : null}
            <Text style={[typography.muted, styles.status]} numberOfLines={1}>{p.status}</Text>
          </View>
        </View>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { width: FEATURED_CARD_WIDTH, padding: 0, overflow: 'hidden' },
  flex: { flex: 1 },
  photo: { width: '100%', height: 140, borderRadius: 0 },
  verified: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.successSoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  verifiedText: { color: colors.success, fontSize: 11, fontWeight: '600' },
  heart: { position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 12, gap: 4 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  price: { color: colors.text, fontWeight: '700', fontSize: 16 },
  status: { marginLeft: 'auto', color: colors.primary, fontWeight: '600' },
});
