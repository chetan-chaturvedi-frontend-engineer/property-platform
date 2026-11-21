import Chip, { type ChipProps } from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';

import type { ContentPageType } from '../types/contentPage.types';
import { CONTENT_PAGE_TYPE_META } from '../utils/contentPageDisplay';

interface ContentPageTypeChipProps extends Omit<ChipProps, 'label' | 'color' | 'sx'> {
  type: ContentPageType;
}

/** Tinted page type badge (static blue, system purple). */
export function ContentPageTypeChip({ type, ...rest }: ContentPageTypeChipProps) {
  const meta = CONTENT_PAGE_TYPE_META[type];
  return (
    <Tooltip title={meta.description}>
      <Chip
        size="small"
        label={meta.label}
        className="font-medium whitespace-nowrap"
        sx={{
          bgcolor: `rgba(var(--mui-palette-${meta.tone}-mainChannel) / 0.12)`,
          color: `${meta.tone}.main`,
        }}
        {...rest}
      />
    </Tooltip>
  );
}
