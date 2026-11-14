import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Icon, PropertyPhoto, Tag } from '../../../components';
import { useRootNavigation } from '../../../navigation/useRootNavigation';
import { colors, typography } from '../../../theme';
import { Property } from '../../../types';

interface Props {
  property: Property;
  liked?: boolean;
  onToggleLike?: () => void;
  showActions?: boolean;
}

/** Horizontal property card used by Saved / Recently Viewed / Home lists. */
export function PropertyListCard({ property: p, liked, onToggleLike, showActions }: Props) {
  const nav = useRootNavigation();
  const open = () => nav.navigate('PropertyDetails', { id: p.id });
  return (
    <Card style={styles.card}>
      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={`Open ${p.name}`} style={styles.row}>
        <PropertyPhoto tone={p.tone} uri={p.coverUrl} label={p.photos > 0 ? `${p.photos} ${p.photos === 1 ? 'Photo' : 'Photos'}` : undefined} style={styles.photo} />
        <View style={styles.flex}>
          <View style={styles.titleRow}>
            <Text style={[typography.h3, styles.flex]} numberOfLines={1}>{p.name}</Text>
            {onToggleLike ? (
              <Pressable onPress={onToggleLike} accessibilityRole="button" accessibilityLabel="Toggle saved">
                <Icon name={liked ? 'heart' : 'heart-outline'} size={18} color={liked ? colors.danger : colors.textFaint} />
              </Pressable>
            ) : null}
          </View>
          <Text style={typography.muted} numberOfLines={1}>{p.area}</Text>
          <Text style={typography.muted}>{p.config}</Text>
          <View style={styles.tags}>
            {p.sqft ? <Tag label={p.sqft} /> : null}
            <Tag label={p.status} tone={p.status === 'Ready to Move' ? 'success' : 'primary'} />
          </View>
          <Text style={styles.price}>{p.price} <Text style={typography.muted}>onwards</Text></Text>
        </View>
      </Pressable>
      {showActions ? (
        <View style={styles.actions}>
          <Button small variant="outline" label="View Details" onPress={open} style={styles.flex} />
          <Button small icon="calendar-outline" label="Schedule Visit" onPress={() => nav.navigate('ScheduleVisit', { id: p.id })} style={styles.flex} />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 12, padding: 10 },
  row: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
  photo: { width: 96, height: 116 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tags: { flexDirection: 'row', gap: 6, marginVertical: 4, flexWrap: 'wrap' },
  price: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
});
