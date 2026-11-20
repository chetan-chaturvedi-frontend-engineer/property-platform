import { env } from '@/config/env';

import { sanitizeUrl } from './security';

/** Pixel size of an image. */
export interface ImageDimensions {
  width: number;
  height: number;
}

/** Upload progress callback: 0-100. */
export type UploadProgressHandler = (percent: number) => void;

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

/**
 * Image URLs in admin responses are API paths (`/api/v1/admin/…`) streamed after authorization, so
 * they are resolved against the API's origin, which differs from the dashboard's when
 * `VITE_API_BASE_URL` is absolute.
 */
export function apiAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  try {
    const apiOrigin = new URL(env.apiBaseUrl, window.location.origin).origin;
    return sanitizeUrl(new URL(path, apiOrigin).href);
  } catch {
    return null;
  }
}

/** A local `data:image/…` preview as is, or an API image path resolved to a safe URL. */
export function imageSrc(src: string | null | undefined): string | null {
  return src && isImageDataUrl(src) ? src : apiAssetUrl(src);
}
