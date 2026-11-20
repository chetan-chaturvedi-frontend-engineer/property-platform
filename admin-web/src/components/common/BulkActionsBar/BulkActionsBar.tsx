import Close from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

interface BulkActionsBarProps {
  /** Number of selected rows; the bar is hidden at 0. */
  count: number;
  onClear: () => void;
  /** Buttons for the selection. */
  children: ReactNode;
}

/** Shown above a table while rows are selected. */
export function BulkActionsBar({ count, onClear, children }: BulkActionsBarProps) {
  if (count === 0) return null;
  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className="flex flex-wrap items-center gap-2 border-y bg-[var(--mui-palette-action-selected)] px-4 py-2"
    >
      <Tooltip title="Clear selection">
        <IconButton size="small" aria-label="Clear selection" onClick={onClear}>
          <Close fontSize="small" />
        </IconButton>
      </Tooltip>
      <Typography variant="body2" fontWeight={600} className="mr-auto" aria-live="polite">
        {count} selected
      </Typography>
      {children}
    </div>
  );
}
