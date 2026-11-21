import { launchImageLibrary } from 'react-native-image-picker';
import { PickedPhoto } from '../../types';

export const MAX_PHOTOS = 10;

/** Opens the system photo picker (no storage permission needed) and returns the chosen photos. */
export async function pickPhotos(limit: number): Promise<PickedPhoto[]> {
  if (limit <= 0) {
    return [];
  }
  const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: limit, quality: 0.8, maxWidth: 2000, maxHeight: 2000 });
  return (result.assets ?? [])
    .filter(a => !!a.uri)
    .map((a, i) => ({
      uri: a.uri as string,
      name: a.fileName ?? `photo-${Date.now()}-${i}.jpg`,
      type: a.type ?? 'image/jpeg',
    }));
}
