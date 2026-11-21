import Chip, { type ChipProps } from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';

import type { ContentPageStatus } from '../types/contentPage.types';
import { CONTENT_PAGE_STATUS_META } from '../utils/contentPageDisplay';

interface ContentPageStatusChipProps extends Omit<ChipProps, 'label' | 'color'> {
  status: ContentPageStatus;
}

/** The page's status as text plus color (never color alone), explained in a tooltip. */
export function ContentPageStatusChip({ status, ...rest }: ContentPageStatusChipProps) {
  const meta = CONTENT_PAGE_STATUS_META[status];
  return (
    <Tooltip title={meta.description}>
      <Chip
        size="small"
        variant="outlined"
        color={meta.color}
        label={meta.label}
        icon={<span aria-hidden className="ml-2 size-1.5 rounded-full bg-current" />}
        className="font-medium whitespace-nowrap"
        {...rest}
      />
    </Tooltip>
  );
}
