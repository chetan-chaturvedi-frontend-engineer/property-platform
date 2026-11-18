import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import { useTheme } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Link as RouterLink, NavLink } from 'react-router-dom';

import logoUrl from '@/assets/icons/logo.svg';
import { env } from '@/config/env';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useUiStore } from '@/store/uiStore';
import { PRIMARY_STRONG } from '@/theme/theme';
import { LAYOUT, ROUTES } from '@/utils/constants';

import { NAV_SECTIONS } from './navItems';

function Brand({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <RouterLink
      to={ROUTES.dashboard}
      onClick={onNavigate}
      className={`flex shrink-0 items-center gap-3 border-b text-inherit no-underline ${collapsed ? 'justify-center px-2' : 'px-5'}`}
      style={{ height: LAYOUT.navbarHeight }}
    >
      {/* Explicit size: no layout shift while the image loads. */}
      <img src={logoUrl} alt="" width={32} height={32} decoding="async" />
      {collapsed ? (
        <span className="sr-only">{env.appName}</span>
      ) : (
        <span className="min-w-0">
          <Typography variant="subtitle1" component="span" fontWeight={700} noWrap display="block">
            {env.appName}
          </Typography>
          <Typography
            variant="caption"
            component="span"
            display="block"
            sx={{ color: PRIMARY_STRONG, lineHeight: 1.2 }}
          >
            Admin panel
          </Typography>
        </span>
      )}
    </RouterLink>
  );
}

function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { hasAll } = usePermissions();
  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => hasAll(item.requiredPermissions)),
  })).filter((section) => section.items.length > 0);

  return (
    <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-3">
      {sections.map((section, index) => (
        <List
          key={section.title ?? index}
          disablePadding
          className="mb-2 flex flex-col gap-0.5"
          aria-label={section.title}
          subheader={
            section.title && !collapsed ? (
              <ListSubheader
                disableSticky
                className="bg-transparent px-3 pt-3 pb-1 text-[11px] leading-5 font-semibold tracking-wider uppercase"
              >
                {section.title}
              </ListSubheader>
            ) : undefined
          }
        >
          {collapsed && index > 0 && <Divider className="mx-2 my-2" />}
          {section.items.map((item) => (
            <Tooltip key={item.path} title={collapsed ? item.label : ''} placement="right">
              <ListItemButton
                component={NavLink}
                to={item.path}
                onClick={onNavigate}
                aria-label={collapsed ? item.label : undefined}
                className={`relative rounded-lg transition-colors ${collapsed ? 'justify-center px-0' : ''}`}
                sx={(theme) => ({
                  minHeight: 42,
                  '& .MuiListItemIcon-root': { color: 'text.secondary' },
                  '&.active': {
                    bgcolor: 'var(--mui-palette-primary-100)',
                    color: PRIMARY_STRONG,
                    fontWeight: 600,
                    '& .MuiListItemIcon-root': { color: PRIMARY_STRONG },
                    '& .MuiListItemText-primary': { fontWeight: 600 },
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      left: -12,
                      top: 8,
                      bottom: 8,
                      width: 3,
                      borderRadius: 4,
                      bgcolor: PRIMARY_STRONG,
                    },
                    ...theme.applyStyles('dark', {
                      bgcolor: 'rgba(var(--mui-palette-primary-mainChannel) / 0.15)',
                    }),
                  },
                })}
              >
                <ListItemIcon className={collapsed ? 'min-w-0' : 'min-w-10'}>
                  {item.icon}
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText
                    primary={item.label}
                    slotProps={{ primary: { variant: 'body2' } }}
                  />
                )}
              </ListItemButton>
            </Tooltip>
          ))}
        </List>
      ))}
    </nav>
  );
}

interface SidebarProps {
  /** Desktop only: icons without labels. */
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

/** Permanent drawer on desktop (collapsible to icons), temporary drawer on small screens. */
export function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'), { noSsr: true });
  const isOpen = useUiStore((state) => state.isMobileSidebarOpen);
  const close = useUiStore((state) => state.closeMobileSidebar);
  const width = collapsed ? LAYOUT.sidebarCollapsedWidth : LAYOUT.sidebarWidth;

  if (isDesktop) {
    return (
      <Drawer
        variant="permanent"
        sx={{
          width,
          flexShrink: 0,
          transition: theme.transitions.create('width'),
          '& .MuiDrawer-paper': {
            width,
            boxSizing: 'border-box',
            overflowX: 'hidden',
            transition: theme.transitions.create('width'),
          },
        }}
      >
        <Brand collapsed={collapsed} />
        <SidebarNav collapsed={collapsed} />
        <div className={`flex border-t p-2 ${collapsed ? 'justify-center' : 'justify-end'}`}>
          <Tooltip title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} placement="right">
            <IconButton
              onClick={onToggleCollapsed}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!collapsed}
              size="small"
            >
              {collapsed ? <ChevronRight /> : <ChevronLeft />}
            </IconButton>
          </Tooltip>
        </div>
      </Drawer>
    );
  }
  return (
    <Drawer
      variant="temporary"
      open={isOpen}
      onClose={close}
      ModalProps={{ keepMounted: true }}
      sx={{ '& .MuiDrawer-paper': { width: LAYOUT.sidebarWidth, boxSizing: 'border-box' } }}
    >
      <Brand collapsed={false} onNavigate={close} />
      <SidebarNav collapsed={false} onNavigate={close} />
    </Drawer>
  );
}
