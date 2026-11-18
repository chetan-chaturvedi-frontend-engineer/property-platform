import Logout from '@mui/icons-material/Logout';
import Person from '@mui/icons-material/Person';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ConfirmDialog } from '@/components/common/Modal';
import { useLogout } from '@/features/auth/hooks/useAuthMutations';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/utils/constants';
import { getInitials } from '@/utils/helpers';

export function UserMenu() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const logout = useLogout();
  const menuId = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const signOut = () => {
    logout.mutate(undefined, {
      onSettled: () => {
        setConfirmOpen(false);
        void navigate(ROUTES.login, { replace: true });
      },
    });
  };

  return (
    <>
      <IconButton
        aria-label="Account menu"
        aria-controls={anchor ? menuId : undefined}
        aria-haspopup="true"
        aria-expanded={anchor ? 'true' : undefined}
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        <Avatar
          sx={{
            width: 34,
            height: 34,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            fontSize: 14,
          }}
        >
          {getInitials(user?.fullName)}
        </Avatar>
      </IconButton>
      <Menu id={menuId} anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <div className="px-4 py-2">
          <Typography fontWeight={600}>{user?.fullName}</Typography>
          <Typography variant="body2" color="text.secondary">
            {user?.role.name}
          </Typography>
        </div>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            void navigate(ROUTES.profile);
          }}
        >
          <ListItemIcon>
            <Person fontSize="small" />
          </ListItemIcon>
          Profile
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            setConfirmOpen(true);
          }}
        >
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          Sign out
        </MenuItem>
      </Menu>
      <ConfirmDialog
        open={confirmOpen}
        title="Sign out?"
        description="You will need to sign in again to use the dashboard."
        confirmLabel="Sign out"
        loading={logout.isPending}
        onConfirm={signOut}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
