import { useCallback, useState } from 'react';

import { validateUploadFile } from '@/utils/fileValidation';

import type { ImageDimensions } from '../types/banner.types';
import { readImageDimensions, readAsDataUrl } from '../utils/bannerImage';

export interface PickedImage {
  file: File;
  /** `data:` URL for the local preview (no object URL to revoke). */
  url: string;
  dimensions: ImageDimensions | null;
}

/**
 * The image picked in the form: validated (type by content, size) before it is accepted, with a
 * local preview URL and its pixel size. The backend repeats every check on upload.
 */
export function useBannerImagePicker(initial: PickedImage | null = null) {
  const [picked, setPicked] = useState<PickedImage | null>(initial);

  /** Resolves to an error message, or null when the file was accepted. */
  const select = useCallback(async (file: File): Promise<string | null> => {
    const result = await validateUploadFile(file, ['image']);
    if (!result.valid) return result.error;
    const url = await readAsDataUrl(file);
    setPicked({ file, url, dimensions: null });
    // The size only drives a hint, so the form does not wait for the browser to decode the image.
    void readImageDimensions(url).then((dimensions) =>
      setPicked((value) => (value?.url === url ? { ...value, dimensions } : value)),
    );
    return null;
  }, []);

  const remove = useCallback(() => setPicked(null), []);

  return { picked, select, remove };
}

/** A downloaded image as a picked one, e.g. the copy of a banner being duplicated. */
export async function toPickedImage(file: File): Promise<PickedImage> {
  return { file, url: await readAsDataUrl(file), dimensions: null };
}
