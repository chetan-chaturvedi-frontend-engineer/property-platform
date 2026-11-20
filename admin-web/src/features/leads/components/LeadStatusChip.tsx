import Chip, { type ChipProps } from '@mui/material/Chip';

import type { LeadPriority, LeadStatus } from '../types/lead.types';
import { LEAD_PRIORITY_META, LEAD_STATUS_META } from '../utils/leadDisplay';

interface LeadStatusChipProps extends Omit<ChipProps, 'label' | 'color'> {
  status: LeadStatus;
}

/** Text plus color, so the status never depends on color alone. */
export function LeadStatusChip({ status, ...rest }: LeadStatusChipProps) {
  const meta = LEAD_STATUS_META[status];
  return (
    <Chip
      size="small"
      variant="outlined"
      color={meta.color}
      label={meta.label}
      icon={<span aria-hidden className="ml-2 size-1.5 rounded-full bg-current" />}
      className="font-medium whitespace-nowrap"
      {...rest}
    />
  );
}

interface LeadPriorityChipProps extends Omit<ChipProps, 'label' | 'color'> {
  priority: LeadPriority;
}

export function LeadPriorityChip({ priority, ...rest }: LeadPriorityChipProps) {
  const meta = LEAD_PRIORITY_META[priority];
  return (
    <Chip
      size="small"
      variant="filled"
      color={meta.color}
      label={meta.label}
      className="font-medium"
      {...rest}
    />
  );
}
