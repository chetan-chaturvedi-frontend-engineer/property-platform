export type BadgeTone =
  'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' | 'errorStrong' | 'neutral';

/** Soft badge colors from the theme palette, so they follow light and dark mode. */
export const BADGE_TONE_CLASSES: Record<BadgeTone, string> = {
  primary: 'bg-primary-100 text-primary-800 dark:bg-primary-500/15 dark:text-primary-300',
  secondary:
    'bg-[rgba(var(--mui-palette-secondary-mainChannel)/0.12)] text-[var(--mui-palette-secondary-dark)] dark:text-[var(--mui-palette-secondary-main)]',
  info: 'bg-[rgba(var(--mui-palette-info-mainChannel)/0.12)] text-[var(--mui-palette-info-main)]',
  success:
    'bg-[rgba(var(--mui-palette-success-mainChannel)/0.12)] text-[var(--mui-palette-success-main)]',
  warning:
    'bg-[rgba(var(--mui-palette-warning-mainChannel)/0.14)] text-[var(--mui-palette-warning-main)]',
  error:
    'bg-[rgba(var(--mui-palette-error-mainChannel)/0.12)] text-[var(--mui-palette-error-main)]',
  // Solid fill, so "Blocked" stands apart from the soft red "Inactive".
  errorStrong: 'bg-[var(--mui-palette-error-dark)] text-[var(--mui-palette-common-white)]',
  neutral: 'bg-[var(--mui-palette-action-hover)] text-muted',
};
