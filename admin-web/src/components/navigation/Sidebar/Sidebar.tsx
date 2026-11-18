import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { NavLink } from 'react-router-dom';

import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useUiStore } from '@/store/uiStore';
import { PRIMARY_STRONG } from '@/theme/theme';
import { LAYOUT } from '@/utils/constants';

import { NAV_ITEMS } from './navItems';

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { hasAll } = usePermissions();
  const items = NAV_ITEMS.filter((item) => hasAll(item.requiredPermissions));

  return (
    <nav aria-label="Main navigation" className="px-3 py-4">
      <List disablePadding className="flex flex-col gap-1">
        {items.map((item) => (
          <ListItemButton
            key={item.path}
            component={NavLink}
            to={item.path}
            onClick={onNavigate}
            className="rounded-lg"
            sx={(theme) => ({
              '&.active': {
                bgcolor: 'var(--mui-palette-primary-100)',
                color: PRIMARY_STRONG,
                '& .MuiListItemIcon-root': { color: PRIMARY_STRONG },
                ...theme.applyStyles('dark', {
                  bgcolor: 'rgba(var(--mui-palette-primary-mainChannel) / 0.15)',
                }),
              },
            })}
          >
            <ListItemIcon className="min-w-10">{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </nav>
  );
}

/** Permanent drawer on desktop, temporary drawer on small screens. */
export function Sidebar() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'), { noSsr: true });
  const isOpen = useUiStore((state) => state.isMobileSidebarOpen);
  const close = useUiStore((state) => state.closeMobileSidebar);

  const paperSx = { width: LAYOUT.sidebarWidth, boxSizing: 'border-box' as const };

  if (isDesktop) {
    return (
      <Drawer
        variant="permanent"
        sx={{
          width: LAYOUT.sidebarWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            ...paperSx,
            top: LAYOUT.navbarHeight,
            height: `calc(100% - ${LAYOUT.navbarHeight}px)`,
          },
        }}
      >
        <SidebarNav />
      </Drawer>
    );
  }
  return (
    <Drawer
      variant="temporary"
      open={isOpen}
      onClose={close}
      ModalProps={{ keepMounted: true }}
      sx={{ '& .MuiDrawer-paper': paperSx }}
    >
      <SidebarNav onNavigate={close} />
    </Drawer>
  );
}
