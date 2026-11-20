import Paper, { type PaperProps } from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { cn } from '@/utils/helpers';

interface FormSectionProps extends Omit<PaperProps, 'title'> {
  title: string;
  icon: ReactNode;
  /** Short line under the title. */
  description?: ReactNode;
  /** Extra controls on the right of the header, e.g. a toggle. */
  actions?: ReactNode;
  children: ReactNode;
}

/** A white card with an icon heading, as used on the editor forms and their side panels. */
export function FormSection({
  title,
  icon,
  description,
  actions,
  children,
  className,
  ...rest
}: FormSectionProps) {
  return (
    <Paper
      component="section"
      aria-label={title}
      className={cn('flex flex-col gap-4 p-5', className)}
      {...rest}
    >
      <header className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300"
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <Typography variant="subtitle1" component="h2" fontWeight={700}>
            {title}
          </Typography>
          {description && (
            <Typography variant="caption" color="text.secondary" component="p">
              {description}
            </Typography>
          )}
        </div>
        {actions}
      </header>
      {children}
    </Paper>
  );
}
