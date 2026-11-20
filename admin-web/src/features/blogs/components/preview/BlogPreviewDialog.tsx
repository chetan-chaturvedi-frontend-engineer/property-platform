import DesktopWindowsOutlined from '@mui/icons-material/DesktopWindowsOutlined';
import SmartphoneOutlined from '@mui/icons-material/SmartphoneOutlined';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useState } from 'react';

import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { cn } from '@/utils/helpers';

import { BlogArticle, type BlogArticleData } from './BlogArticle';

type Device = 'desktop' | 'mobile';

interface BlogPreviewDialogProps {
  open: boolean;
  data: BlogArticleData;
  onClose: () => void;
}

/**
 * The whole article in a desktop or phone-width frame. Rendered here from the form (or the admin
 * API), so drafts are previewed without ever being public.
 */
export function BlogPreviewDialog({ open, data, onClose }: BlogPreviewDialogProps) {
  const [device, setDevice] = useState<Device>('desktop');
  return (
    <Modal
      open={open}
      onClose={onClose}
      maxWidth="md"
      title={
        <span className="flex flex-wrap items-center justify-between gap-2">
          Blog preview
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
        </span>
      }
      actions={
        <Button variant="outlined" onClick={onClose}>
          Close preview
        </Button>
      }
    >
      <div
        role="figure"
        aria-label={`${device === 'mobile' ? 'Mobile' : 'Desktop'} preview`}
        className={cn(
          'mx-auto w-full transition-[max-width] duration-300',
          device === 'mobile' &&
            'max-w-[380px] rounded-[1.75rem] border-[6px] border-[var(--mui-palette-text-primary)] p-3 pt-6',
        )}
      >
        <BlogArticle data={data} density={device === 'mobile' ? 'compact' : 'comfortable'} />
      </div>
    </Modal>
  );
}
