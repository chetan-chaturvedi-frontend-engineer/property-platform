import Chip, { type ChipProps } from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';

import type { CategoryTone } from '../utils/faqDisplay';

interface FaqCategoryChipProps extends Omit<ChipProps, 'label' | 'color' | 'sx'> {
  /** Configured label; null when the category was removed from the configuration. */
  label: string | null;
  tone?: CategoryTone;
}

/** Colored category badge. A removed category is flagged in text, since it hides the FAQ publicly. */
export function FaqCategoryChip({ label, tone = 'primary', ...rest }: FaqCategoryChipProps) {
  if (label === null) {
    return (
      <Tooltip title="This category is no longer configured, so the FAQ is hidden from the website and app. Move it to another category.">
        <Chip
          size="small"
          variant="outlined"
          label="Removed category"
          className="whitespace-nowrap"
          {...rest}
        />
      </Tooltip>
    );
  }
  return (
    <Chip
      size="small"
      label={label}
      className="font-medium whitespace-nowrap"
      sx={
        tone === 'neutral'
          ? { bgcolor: 'action.hover', color: 'text.secondary' }
          : {
              bgcolor: `rgba(var(--mui-palette-${tone}-mainChannel) / 0.12)`,
              color: `${tone}.main`,
            }
      }
      {...rest}
    />
  );
}
