import type { ReactNode } from 'react';

import { cn } from '@/utils/helpers';

interface CharCountProps {
  /** Hint on the left. */
  hint?: ReactNode;
  length: number;
  /** Hard limit (backend). */
  max: number;
  /** Soft limit, e.g. what search engines show; the count turns orange above it. */
  recommended?: number;
}

/** Helper text with a live "12 / 255" character count. */
export function CharCount({ hint, length, max, recommended }: CharCountProps) {
  const over = recommended !== undefined && length > recommended;
  return (
    <span className="flex items-start justify-between gap-3">
      <span>{hint}</span>
      <span
        className={cn('shrink-0 tabular-nums', over && 'text-[var(--mui-palette-warning-main)]')}
        aria-label={`${length} of ${max} characters`}
      >
        {length.toLocaleString()} / {(recommended ?? max).toLocaleString()}
      </span>
    </span>
  );
}
