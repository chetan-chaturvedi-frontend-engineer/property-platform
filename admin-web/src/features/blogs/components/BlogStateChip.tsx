import Chip, { type ChipProps } from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';

import type { BlogPublicState } from '../types/blog.types';
import { PUBLIC_STATE_META } from '../utils/blogDisplay';

interface BlogStateChipProps extends Omit<ChipProps, 'label' | 'color'> {
  state: BlogPublicState;
}

/** The blog's public state as text plus color (never color alone), explained in a tooltip. */
export function BlogStateChip({ state, ...rest }: BlogStateChipProps) {
  const meta = PUBLIC_STATE_META[state];
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
