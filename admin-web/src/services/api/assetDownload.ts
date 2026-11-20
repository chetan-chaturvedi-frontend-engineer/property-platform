import type { AxiosProgressEvent } from 'axios';

import { apiAssetUrl, type UploadProgressHandler } from '@/utils/image';

import { apiClient } from './axiosInstance';

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Downloads an image the admin API streams (an `imageUrl` / `featureImageUrl` path) as a File, read
 * with the session cookie. Used to copy a record: the copy needs its own upload.
 */
export async function downloadApiImage(
  path: string,
  baseName: string,
  signal?: AbortSignal,
): Promise<File> {
  const url = apiAssetUrl(path);
  if (!url) throw new Error('The image URL is not valid.');
  const { data } = await apiClient.get<Blob>(url, { responseType: 'blob', baseURL: '', signal });
  const type = data.type || 'image/jpeg';
  return new File([data], `${baseName}.${EXTENSIONS[type] ?? 'jpg'}`, { type });
}

/** Axios upload progress as a 0-100 callback. */
export function uploadProgress(onProgress?: UploadProgressHandler) {
  return onProgress
    ? (event: AxiosProgressEvent) => {
        if (event.total) onProgress(Math.round((event.loaded / event.total) * 100));
      }
    : undefined;
}

/** Up to 10 MB over a slow line takes longer than the default API timeout. */
export const UPLOAD_OPTIONS = { timeout: 0 } as const;
