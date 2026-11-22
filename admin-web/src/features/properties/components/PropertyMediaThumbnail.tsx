import PhotoLibraryOutlined from '@mui/icons-material/PhotoLibraryOutlined';

import { cn } from '@/utils/helpers';

import { PropertyThumbnail } from './PropertyThumbnail';

interface PropertyMediaThumbnailProps {
  url: string | null | undefined;
  alt: string;
  /** Media files of the property; the badge is hidden when unknown. */
  mediaCount?: number;
  className?: string;
}

/** Property photo (or placeholder) with the number of media files as an overlay badge. */
export function PropertyMediaThumbnail({
  url,
  alt,
  mediaCount,
  className,
}: PropertyMediaThumbnailProps) {
  return (
    <div className={cn('relative shrink-0', className)}>
      <PropertyThumbnail url={url} alt={alt} className="size-full" />
      {mediaCount !== undefined && (
        <span
          className="absolute right-1 bottom-1 inline-flex items-center gap-0.5 rounded bg-black/65 px-1 py-px text-[11px] leading-4 font-semibold text-white"
          title={`${mediaCount} media file${mediaCount === 1 ? '' : 's'}`}
        >
          <PhotoLibraryOutlined aria-hidden sx={{ fontSize: 12 }} />
          <span className="sr-only">Media files: </span>
          {mediaCount}
        </span>
      )}
    </div>
  );
}
