import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import type { ReactNode } from 'react';

/** Icon button with a tooltip; the label is also its accessible name. */
export function RowActionButton({
  label,
  onClick,
  children,
  color,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  color?: 'success' | 'error' | 'primary';
}) {
  return (
    <Tooltip title={label}>
      <IconButton size="small" color={color} aria-label={label} onClick={onClick}>
        {children}
      </IconButton>
    </Tooltip>
  );
}
