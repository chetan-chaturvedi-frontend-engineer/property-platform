import ImageOutlined from '@mui/icons-material/ImageOutlined';
import { useState } from 'react';

import { cn } from '@/utils/helpers';

import { bannerAssetUrl } from '../utils/bannerDisplay';
import { isImageDataUrl } from '../utils/bannerImage';

interface BannerThumbnailProps {
  /** The banner's `imageUrl` (API path) or a local `data:image/…` preview. */
  src: string | null | undefined;
  alt: string;
  className?: string;
  /** Above-the-fold images load eagerly. */
  eager?: boolean;
}

/** A banner image at the recommended 1920 × 600 ratio, with a placeholder when missing or broken. */
export function BannerThumbnail({ src, alt, className, eager = false }: BannerThumbnailProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const url = src && isImageDataUrl(src) ? src : bannerAssetUrl(src);
  if (!url || failedSrc === url) {
    return (
      <div
        role="img"
        aria-label={`${alt} (no image)`}
        className={cn(
          'flex aspect-[16/5] items-center justify-center rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300',
          className,
        )}
      >
        <ImageOutlined />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailedSrc(url)}
      className={cn('aspect-[16/5] rounded-lg border object-cover', className)}
    />
  );
}
