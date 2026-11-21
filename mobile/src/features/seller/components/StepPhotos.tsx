import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Icon } from '../../../components';
import { MAX_PHOTOS, pickPhotos } from '../../../services/device/photoPicker';
import { colors, radius, typography } from '../../../theme';
import { PickedPhoto } from '../../../types';

interface Props {
  photos: PickedPhoto[];
  onAdd: (photos: PickedPhoto[]) => void;
  onRemove: (index: number) => void;
}

/** Wizard step 6: photos from the device gallery; the first one is the cover. */
export function StepPhotos({ photos, onAdd, onRemove }: Props) {
  return (
    <>
      <Card style={styles.box}>
        <Icon name="camera-outline" size={32} />
        <Text style={typography.h3}>Photos</Text>
        <Text style={[typography.muted, styles.center]}>Add up to {MAX_PHOTOS} clear photos. The first one is the cover.</Text>
        <Button small icon="images-outline" label="Choose from gallery" onPress={async () => onAdd(await pickPhotos(MAX_PHOTOS - photos.length))} disabled={photos.length >= MAX_PHOTOS} />
      </Card>
      <View style={styles.grid}>
        {photos.map((p, i) => (
          <View key={p.uri} style={styles.thumb}>
            <Image source={{ uri: p.uri }} style={styles.image} accessibilityIgnoresInvertColors />
            {i === 0 ? <Text style={styles.cover}>Cover</Text> : null}
            <Pressable accessibilityRole="button" accessibilityLabel="Remove photo" onPress={() => onRemove(i)} style={styles.remove}>
              <Icon name="close" size={14} color={colors.textInverse} />
            </Pressable>
          </View>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', gap: 8, padding: 20 },
  center: { textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 96, height: 96, borderRadius: radius.md, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  cover: { position: 'absolute', left: 4, bottom: 4, backgroundColor: colors.overlay, color: colors.textInverse, fontSize: 10, fontWeight: '600', paddingHorizontal: 6, borderRadius: 6 },
  remove: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center' },
});
