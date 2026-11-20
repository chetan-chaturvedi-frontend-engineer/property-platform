import DesktopWindowsOutlined from '@mui/icons-material/DesktopWindowsOutlined';
import ImageOutlined from '@mui/icons-material/ImageOutlined';
import LinkOutlined from '@mui/icons-material/LinkOutlined';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import SmartphoneOutlined from '@mui/icons-material/SmartphoneOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { FormSection } from '@/components/common/FormSection';
import { ImageThumbnail } from '@/components/common/ImageThumbnail';
import { cn } from '@/utils/helpers';

type Device = 'desktop' | 'mobile';

interface BannerLivePreviewProps {
  title: string;
  /** Local `data:` preview of the picked file, or the saved image's API path. */
  imageSrc: string | null;
  placementLabel?: string;
  linkLabel?: string;
}

/**
 * How the banner looks on the site: the image at the display ratio, in a desktop or phone-width
 * frame. The banner's text is part of the image itself; the title is the image's alt text.
 */
export function BannerLivePreview({
  title,
  imageSrc,
  placementLabel,
  linkLabel,
}: BannerLivePreviewProps) {
  const [device, setDevice] = useState<Device>('desktop');
  const alt = title.trim() || 'Banner preview';

  return (
    <FormSection
      title="Banner preview"
      icon={<VisibilityOutlined fontSize="small" />}
      description="This is how your banner will look on the website."
      actions={
        <ToggleButtonGroup
          size="small"
          exclusive
          value={device}
          onChange={(_, value: Device | null) => value && setDevice(value)}
          aria-label="Preview device"
        >
          <ToggleButton value="desktop" aria-label="Desktop preview">
            <DesktopWindowsOutlined fontSize="small" />
          </ToggleButton>
          <ToggleButton value="mobile" aria-label="Mobile preview">
            <SmartphoneOutlined fontSize="small" />
          </ToggleButton>
        </ToggleButtonGroup>
      }
    >
      <div
        className={cn(
          'mx-auto w-full transition-[max-width] duration-300',
          device === 'mobile' &&
            'max-w-[300px] rounded-[1.75rem] border-[6px] border-[var(--mui-palette-text-primary)] p-2 pt-5',
        )}
        aria-label={`${device === 'mobile' ? 'Mobile' : 'Desktop'} preview`}
        role="figure"
      >
        {imageSrc ? (
          <ImageThumbnail src={imageSrc} alt={alt} className="w-full shadow-sm" eager />
        ) : (
          <div className="flex aspect-[16/5] w-full flex-col items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-primary-100 to-primary-50 px-4 text-center text-primary-800 dark:from-primary-500/20 dark:to-primary-500/5 dark:text-primary-200">
            <ImageOutlined aria-hidden />
            <Typography
              variant={device === 'mobile' ? 'body2' : 'h6'}
              fontWeight={700}
              className="line-clamp-2"
            >
              {title.trim() || 'Your banner title'}
            </Typography>
            <Typography variant="caption">Upload an image to see the real preview</Typography>
          </div>
        )}
        {device === 'mobile' && (
          <div aria-hidden className="mt-3 flex flex-col gap-2 px-1 pb-2">
            <div className="h-2.5 w-3/4 rounded bg-[var(--mui-palette-action-hover)]" />
            <div className="h-2.5 w-1/2 rounded bg-[var(--mui-palette-action-hover)]" />
          </div>
        )}
      </div>
      {(placementLabel || linkLabel) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {placementLabel && (
            <Typography
              variant="caption"
              color="text.secondary"
              className="inline-flex items-center gap-1"
            >
              <PlaceOutlined fontSize="inherit" aria-hidden /> {placementLabel}
            </Typography>
          )}
          {linkLabel && (
            <Typography
              variant="caption"
              color="text.secondary"
              className="inline-flex items-center gap-1 break-all"
            >
              <LinkOutlined fontSize="inherit" aria-hidden /> {linkLabel}
            </Typography>
          )}
        </div>
      )}
    </FormSection>
  );
}
