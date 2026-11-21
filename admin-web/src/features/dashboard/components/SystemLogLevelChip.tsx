import Chip, { type ChipProps } from '@mui/material/Chip';

import type { SystemLogLevel } from '../types/systemLog.types';
import { SYSTEM_LOG_LEVEL_META } from '../utils/systemLogDisplay';

interface SystemLogLevelChipProps extends Omit<ChipProps, 'label' | 'color'> {
  level: SystemLogLevel;
}

/** Severity badge; the text carries the meaning, the color only reinforces it. */
export function SystemLogLevelChip({ level, size = 'small', ...rest }: SystemLogLevelChipProps) {
  const meta = SYSTEM_LOG_LEVEL_META[level];
  return (
    <Chip
      size={size}
      variant="outlined"
      label={meta.label}
      color={meta.color}
      sx={{ fontWeight: 600, bgcolor: `rgba(var(--mui-palette-${meta.color}-mainChannel) / 0.1)` }}
      {...rest}
    />
  );
}
