import React from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet } from 'react-native';
import { radius } from '../../../theme';
import { useBanners } from '../hooks/useContent';

const WIDTH = 300;
const HEIGHT = 120;

/** Admin-managed promo banners; renders nothing when there are none or they fail to load. */
export function BannerStrip({ placement }: { placement: string }) {
  const { data } = useBanners(placement);
  if (!data || data.length === 0) {
    return null;
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {data.map(b => (
        <Pressable
          key={b.id}
          accessibilityRole={b.link ? 'link' : 'image'}
          accessibilityLabel={b.title}
          disabled={b.linkType !== 'external' || !b.link}
          onPress={() => b.link && Linking.openURL(b.link)}>
          <Image source={{ uri: b.imageUrl }} style={styles.image} resizeMode="cover" accessibilityIgnoresInvertColors />
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 12, paddingHorizontal: 16, paddingTop: 12 },
  image: { width: WIDTH, height: HEIGHT, borderRadius: radius.md },
});
