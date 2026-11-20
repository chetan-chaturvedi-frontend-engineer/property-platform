import ImageOutlined from '@mui/icons-material/ImageOutlined';
import { useState } from 'react';

import { cn } from '@/utils/helpers';
import { imageSrc } from '@/utils/image';

interface ImageThumbnailProps {
  /** An admin API image path or a local `data:image/…` preview. */
  src: string | null | undefined;
  alt: string;
  className?: string;
  /** Tailwind aspect ratio class, e.g. `aspect-[16/5]` (banners) or `aspect-[40/21]` (blogs). */
  aspectClassName?: string;
  /** Above-the-fold images load eagerly. */
  eager?: boolean;
}

/** An image at a fixed ratio, with a placeholder when it is missing or fails to load. */
export function ImageThumbnail({
  src,
  alt,
  className,
  aspectClassName = 'aspect-[16/5]',
  eager = false,
}: ImageThumbnailProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const url = imageSrc(src);
  if (!url || failedSrc === url) {
    return (
      <div
        role="img"
        aria-label={`${alt} (no image)`}
        className={cn(
          'flex items-center justify-center rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300',
          aspectClassName,
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
      className={cn('rounded-lg border object-cover', aspectClassName, className)}
    />
  );
}
