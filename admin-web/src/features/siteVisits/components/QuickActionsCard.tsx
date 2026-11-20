import ChevronRight from '@mui/icons-material/ChevronRight';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';

export interface QuickAction {
  key: string;
  label: string;
  icon: ReactNode;
  /** A route to open, or a handler; one of the two. */
  to?: string;
  onClick?: () => void;
}

interface QuickActionsCardProps {
  title?: string;
  actions: readonly QuickAction[];
}

const itemClass =
  'flex w-full cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm font-medium hover:bg-[var(--mui-palette-action-hover)] focus-visible:outline-2 focus-visible:outline-[var(--app-primary-strong)]';

/** Shortcut buttons and links; renders nothing without actions. */
export function QuickActionsCard({ title = 'Quick actions', actions }: QuickActionsCardProps) {
  if (actions.length === 0) return null;
  return (
    <Paper className="p-4" component="section" aria-label={title}>
      <Typography variant="subtitle1" component="h2" fontWeight={700} className="mb-3">
        {title}
      </Typography>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        {actions.map((action) => {
          const content = (
            <>
              <span aria-hidden className="text-primary-700 dark:text-primary-300 flex">
                {action.icon}
              </span>
              <span className="min-w-0 flex-1 truncate">{action.label}</span>
              <ChevronRight fontSize="small" aria-hidden className="text-muted" />
            </>
          );
          return (
            <li key={action.key}>
              {action.to ? (
                <RouterLink to={action.to} className={itemClass}>
                  {content}
                </RouterLink>
              ) : (
                <button type="button" onClick={action.onClick} className={itemClass}>
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </Paper>
  );
}
