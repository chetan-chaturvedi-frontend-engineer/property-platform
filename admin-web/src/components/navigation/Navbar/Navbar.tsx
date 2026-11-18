import MenuIcon from '@mui/icons-material/Menu';
import AppBar from '@mui/material/AppBar';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import logoUrl from '@/assets/icons/logo.svg';
import { env } from '@/config/env';
import { useUiStore } from '@/store/uiStore';
import { LAYOUT, ROUTES } from '@/utils/constants';

import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

/** Top bar beside the desktop sidebar (which carries the brand); full width on small screens. */
export function Navbar({ sidebarWidth }: { sidebarWidth: number }) {
  const toggleSidebar = useUiStore((state) => state.toggleMobileSidebar);

  return (
    <AppBar
      position="fixed"
      sx={(theme) => ({
        borderBottom: 1,
        borderColor: 'divider',
        transition: theme.transitions.create(['width', 'margin-left']),
        [theme.breakpoints.up('md')]: {
          width: `calc(100% - ${sidebarWidth}px)`,
          ml: `${sidebarWidth}px`,
        },
      })}
    >
      <Toolbar sx={{ minHeight: LAYOUT.navbarHeight }} className="gap-2">
        <IconButton
          edge="start"
          aria-label="Open navigation"
          onClick={toggleSidebar}
          className="md:hidden"
        >
          <MenuIcon />
        </IconButton>
        <RouterLink
          to={ROUTES.dashboard}
          className="flex items-center gap-2 text-inherit no-underline md:hidden"
        >
          <img src={logoUrl} alt="" width={28} height={28} decoding="async" />
          <Typography variant="h6" component="span" noWrap>
            {env.appName}
          </Typography>
        </RouterLink>
        <div className="flex-1" />
        <ThemeToggle />
        <UserMenu />
      </Toolbar>
    </AppBar>
  );
}
