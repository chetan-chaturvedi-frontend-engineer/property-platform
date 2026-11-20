import Chip, { type ChipProps } from '@mui/material/Chip';

import type { SiteVisitStatus, SiteVisitType } from '../types/siteVisit.types';
import {
  SITE_VISIT_STATUS_META,
  SITE_VISIT_TYPE_COLORS,
  SITE_VISIT_TYPE_LABELS,
} from '../utils/siteVisitDisplay';

interface SiteVisitStatusChipProps extends Omit<ChipProps, 'label' | 'color'> {
  status: SiteVisitStatus;
}

/** Text plus color, so the status never depends on color alone. */
export function SiteVisitStatusChip({ status, ...rest }: SiteVisitStatusChipProps) {
  const meta = SITE_VISIT_STATUS_META[status];
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

interface SiteVisitTypeChipProps extends Omit<ChipProps, 'label' | 'color'> {
  visitType: SiteVisitType;
}

export function SiteVisitTypeChip({ visitType, ...rest }: SiteVisitTypeChipProps) {
  const color = SITE_VISIT_TYPE_COLORS[visitType];
  return (
    <Chip
      size="small"
      label={SITE_VISIT_TYPE_LABELS[visitType]}
      className="font-medium whitespace-nowrap"
      // A soft tint rather than a solid fill, like the source labels in the screenshot.
      sx={{
        bgcolor: `rgba(var(--mui-palette-${color}-mainChannel) / 0.12)`,
        color: `var(--mui-palette-${color}-main)`,
      }}
      {...rest}
    />
  );
}
