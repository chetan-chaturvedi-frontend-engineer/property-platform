import LightbulbOutlined from '@mui/icons-material/LightbulbOutlined';
import RuleOutlined from '@mui/icons-material/RuleOutlined';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { ChecklistCard, type ChecklistItem } from './ChecklistCard';

const TIPS: readonly ChecklistItem[] = [
  { key: 'brand', text: 'Use high quality images that represent your brand' },
  { key: 'short', text: 'Keep the text short, simple and easy to read' },
  { key: 'contrast', text: 'Use contrasting colors to make text stand out' },
  { key: 'cta', text: 'Add a clear call-to-action button to the artwork' },
  { key: 'mobile', text: 'Make sure the banner looks good on mobile devices' },
  { key: 'consistent', text: 'Keep branding consistent across banners' },
];

interface BannerSidePanelsProps {
  /** The live preview card, shown first. */
  preview: ReactNode;
  /** Upload limit enforced by the backend, e.g. "10 MB". */
  maxSizeLabel: string;
}

/** Right column of the banner form: preview, guidelines (limits vs. recommendations) and tips. */
export function BannerSidePanels({ preview, maxSizeLabel }: BannerSidePanelsProps) {
  const guidelines: ChecklistItem[] = [
    { key: 'size', text: 'Recommended size: 1920 × 600 pixels', note: 'Recommendation' },
    { key: 'formats', text: 'Supported formats: JPG, PNG, WEBP', note: 'Enforced on upload' },
    { key: 'max', text: `Maximum file size: ${maxSizeLabel}`, note: 'Enforced on upload' },
    { key: 'text', text: 'Keep text short and clear for better visibility' },
    { key: 'quality', text: 'Use high quality images for best results' },
  ];
  return (
    <div className="flex flex-col gap-6">
      {preview}
      <ChecklistCard
        title="Banner guidelines"
        icon={<RuleOutlined fontSize="small" />}
        items={guidelines}
        footer={
          <Typography variant="caption" color="text.secondary">
            The server checks the real file content, so a renamed file of another type is rejected.
          </Typography>
        }
      />
      <ChecklistCard
        title="Tips for better banners"
        icon={<LightbulbOutlined fontSize="small" />}
        items={TIPS}
        marker="circle"
      />
    </div>
  );
}
