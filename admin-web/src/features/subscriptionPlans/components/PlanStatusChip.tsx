import StarRounded from '@mui/icons-material/StarRounded';
import Chip, { type ChipProps } from '@mui/material/Chip';

import type { PlanStatus } from '../types/subscriptionPlan.types';
import { PLAN_STATUS_META } from '../utils/planDisplay';

interface PlanStatusChipProps extends Omit<ChipProps, 'label' | 'color'> {
  status: PlanStatus;
}

/** Text plus color, so the status never depends on color alone. */
export function PlanStatusChip({ status, ...rest }: PlanStatusChipProps) {
  const meta = PLAN_STATUS_META[status];
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

type PopularChipProps = Omit<ChipProps, 'label' | 'color' | 'icon'>;

/** Marks the highlighted ("popular" / recommended) plan. */
export function PopularChip(props: PopularChipProps) {
  return (
    <Chip
      size="small"
      label="Popular"
      icon={<StarRounded fontSize="small" />}
      className="font-medium whitespace-nowrap"
      sx={{
        bgcolor: 'rgba(var(--mui-palette-warning-mainChannel) / 0.14)',
        color: 'var(--mui-palette-warning-dark)',
        '& .MuiChip-icon': { color: 'inherit' },
      }}
      {...props}
    />
  );
}
