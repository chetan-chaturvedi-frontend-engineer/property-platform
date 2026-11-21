import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PropertyPhoto, Tag } from '../../../components';
import type { TagTone } from '../../../components';
import { colors, radius, shadows, typography } from '../../../theme';
import { SellerListing } from '../../../types';

const TONE: Record<SellerListing['status'], TagTone> = { Active: 'success', 'Under Review': 'primary', Incomplete: 'orange', Inactive: 'danger' };

interface Props {
  listing: SellerListing;
  tone: number;
  onPress: () => void;
}

/** A compact listing card for the horizontal "My Properties" strip. */
export function MiniListingCard({ listing, tone, onPress }: Props) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${listing.title}`} onPress={onPress} style={styles.card}>
      <PropertyPhoto tone={tone} style={styles.photo} />
      <View style={styles.body}>
        <Text style={typography.h3} numberOfLines={1}>{listing.title}</Text>
        <Text style={typography.muted} numberOfLines={1}>{listing.area}</Text>
        <Tag label={listing.status} tone={TONE[listing.status]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: 190, backgroundColor: colors.background, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadows.card },
  photo: { height: 96, borderRadius: 0 },
  body: { padding: 10, gap: 4, alignItems: 'flex-start' },
});
