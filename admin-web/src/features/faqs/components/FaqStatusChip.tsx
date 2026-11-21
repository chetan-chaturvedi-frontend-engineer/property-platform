import Chip, { type ChipProps } from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';

import type { FaqStatus } from '../types/faq.types';
import { FAQ_STATUS_META } from '../utils/faqDisplay';

interface FaqStatusChipProps extends Omit<ChipProps, 'label' | 'color'> {
  status: FaqStatus;
}

/** The FAQ's status as text plus color (never color alone), explained in a tooltip. */
export function FaqStatusChip({ status, ...rest }: FaqStatusChipProps) {
  const meta = FAQ_STATUS_META[status];
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
