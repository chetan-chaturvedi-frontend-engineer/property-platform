import IconButton, { type IconButtonProps } from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

interface LeadRowActionProps extends Omit<IconButtonProps, 'aria-label'> {
  /** Tooltip text and accessible name. */
  label: string;
}

/** Icon-only row action with a tooltip; the label is also its accessible name. */
export function LeadRowAction({ label, size = 'small', children, ...rest }: LeadRowActionProps) {
  return (
    <Tooltip title={label}>
      <IconButton size={size} aria-label={label} {...rest}>
        {children}
      </IconButton>
    </Tooltip>
  );
}
