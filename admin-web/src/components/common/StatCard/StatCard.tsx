import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

export type StatCardTone = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

/** Icon tile colors from the theme palette (primary scale and status colors). */
const TONE_CLASSES: Record<StatCardTone, string> = {
  primary: 'bg-primary-100 text-primary-800 dark:bg-primary-500/15 dark:text-primary-300',
  success:
    'bg-[rgba(var(--mui-palette-success-mainChannel)/0.12)] text-[var(--mui-palette-success-main)]',
  warning:
    'bg-[rgba(var(--mui-palette-warning-mainChannel)/0.12)] text-[var(--mui-palette-warning-main)]',
  error:
    'bg-[rgba(var(--mui-palette-error-mainChannel)/0.12)] text-[var(--mui-palette-error-main)]',
  info: 'bg-[rgba(var(--mui-palette-info-mainChannel)/0.12)] text-[var(--mui-palette-info-main)]',
  neutral: 'bg-[var(--mui-palette-action-hover)] text-muted',
};

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  /** Secondary line under the value, e.g. a share of the total. */
  caption?: ReactNode;
  tone?: StatCardTone;
  isLoading?: boolean;
}

export function StatCard({
  label,
  value,
  icon,
  caption,
  tone = 'primary',
  isLoading = false,
}: StatCardProps) {
  return (
    <Paper className="flex h-full items-start gap-4 p-5 transition-shadow hover:shadow-md">
      <div
        className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${TONE_CLASSES[tone]}`}
        aria-hidden
      >
        {icon}
      </div>
      <div className="min-w-0">
        <Typography variant="h5" component="p" noWrap fontWeight={700}>
          {isLoading ? <Skeleton width={64} /> : value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        {caption && (
          <Typography variant="caption" color="text.secondary" component="p" className="mt-1">
            {isLoading ? <Skeleton width={96} /> : caption}
          </Typography>
        )}
      </div>
    </Paper>
  );
}
