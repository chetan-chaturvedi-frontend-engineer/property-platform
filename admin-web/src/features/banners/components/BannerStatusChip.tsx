import Chip, { type ChipProps } from '@mui/material/Chip';

import type { BannerDisplayState } from '../types/banner.types';
import { DISPLAY_STATE_META } from '../utils/bannerDisplay';

interface BannerStatusChipProps extends Omit<ChipProps, 'label' | 'color'> {
  state: BannerDisplayState;
}

/** The banner's display state as text plus color, so it never depends on color alone. */
export function BannerStatusChip({ state, ...rest }: BannerStatusChipProps) {
  const meta = DISPLAY_STATE_META[state];
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
