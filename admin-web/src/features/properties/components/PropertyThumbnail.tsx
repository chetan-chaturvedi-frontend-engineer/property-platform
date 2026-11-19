import ApartmentOutlined from '@mui/icons-material/ApartmentOutlined';
import { useState } from 'react';

import { sanitizeUrl } from '@/utils/security';
import { cn } from '@/utils/helpers';

interface PropertyThumbnailProps {
  url: string | null | undefined;
  alt: string;
  className?: string;
  /** Above-the-fold images load eagerly. */
  eager?: boolean;
}

/** A property photo from the API (admin content path), with a placeholder when missing or broken. */
export function PropertyThumbnail({ url, alt, className, eager = false }: PropertyThumbnailProps) {
  const [failed, setFailed] = useState(false);
  const src = sanitizeUrl(url);
  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={`${alt} (no photo)`}
        className={cn(
          'flex items-center justify-center rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300',
          className,
        )}
      >
        <ApartmentOutlined />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
      className={cn('rounded-lg object-cover', className)}
    />
  );
}
