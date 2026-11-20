import MoreHoriz from '@mui/icons-material/MoreHoriz';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import { type ReactNode, useId, useState } from 'react';

export interface RowMenuAction {
  key: string;
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  /** Destructive actions are separated and shown in the error color. */
  tone?: 'default' | 'danger';
}

interface SiteVisitRowMenuProps {
  /** Accessible name of the menu button, e.g. "Actions for SV-100012". */
  label: string;
  actions: readonly RowMenuAction[];
}

/** The three-dot action menu of a table row. Renders nothing when no action is available. */
export function SiteVisitRowMenu({ label, actions }: SiteVisitRowMenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const menuId = useId();
  if (actions.length === 0) return null;

  const regular = actions.filter((action) => action.tone !== 'danger');
  const danger = actions.filter((action) => action.tone === 'danger');
  const choose = (action: RowMenuAction) => {
    setAnchor(null);
    action.onSelect();
  };
  const item = (action: RowMenuAction) => (
    <MenuItem
      key={action.key}
      onClick={() => choose(action)}
      sx={action.tone === 'danger' ? { color: 'error.main' } : undefined}
    >
      <ListItemIcon sx={action.tone === 'danger' ? { color: 'error.main' } : undefined}>
        {action.icon}
      </ListItemIcon>
      <ListItemText>{action.label}</ListItemText>
    </MenuItem>
  );

  return (
    <>
      <Tooltip title="Actions">
        <IconButton
          size="small"
          aria-label={label}
          aria-haspopup="menu"
          aria-controls={anchor ? menuId : undefined}
          aria-expanded={anchor ? true : undefined}
          onClick={(event) => setAnchor(event.currentTarget)}
          className="rounded-lg border"
        >
          <MoreHoriz fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        id={menuId}
        anchorEl={anchor}
        open={anchor !== null}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {regular.map(item)}
        {regular.length > 0 && danger.length > 0 && <Divider />}
        {danger.map(item)}
      </Menu>
    </>
  );
}
