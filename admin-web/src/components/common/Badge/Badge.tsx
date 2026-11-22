import type { HTMLAttributes, ReactNode } from 'react';

import { BADGE_TONE_CLASSES, type BadgeTone } from './badgeTones';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  /** Leading status dot. */
  dot?: boolean;
  children: ReactNode;
}

/** Compact pill label (statuses, roles, types), colored from the theme palette. */
export function Badge({
  tone = 'neutral',
  dot = false,
  children,
  className = '',
  ...rest
}: BadgeProps) {
  return (
    <span
      {...rest}
      className={`inline-flex max-w-full items-center gap-1.5 rounded-md px-2 py-0.5 text-xs leading-5 font-semibold whitespace-nowrap ${BADGE_TONE_CLASSES[tone]} ${className}`}
    >
      {dot && <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />}
      <span className="truncate">{children}</span>
    </span>
  );
}
