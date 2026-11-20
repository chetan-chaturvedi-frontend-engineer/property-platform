import type { ImageDimensions } from '../types/banner.types';

/** Natural size of an image URL, or null if the browser cannot decode it in time. */
export function readImageDimensions(url: string): Promise<ImageDimensions | null> {
  return new Promise((resolve) => {
    const image = new Image();
    // Environments that never decode (tests, some privacy modes) must not hold the form up.
    const timer = setTimeout(() => resolve(null), 3000);
    image.onload = () => {
      clearTimeout(timer);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    image.src = url;
  });
}

export function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('Could not read the image.'));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the image.'));
    reader.readAsDataURL(file);
  });
}

/** Only image data URLs of the allowed types may be shown as a preview. */
export function isImageDataUrl(value: string): boolean {
  return /^data:image\/(jpeg|png|webp);base64,/.test(value);
}

/** Recommended (not enforced by the backend) display size of a banner image. */
export const RECOMMENDED_BANNER_SIZE: ImageDimensions = { width: 1920, height: 600 };
