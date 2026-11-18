import Dashboard from '@mui/icons-material/Dashboard';
import History from '@mui/icons-material/History';
import Person from '@mui/icons-material/Person';

import type { NavItem } from '@/types/common.types';
import { PERMISSIONS, ROUTES } from '@/utils/constants';

export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Dashboard', path: ROUTES.dashboard, icon: <Dashboard /> },
  {
    label: 'Activity log',
    path: ROUTES.activity,
    icon: <History />,
    requiredPermissions: [PERMISSIONS.systemLogList],
  },
  { label: 'Profile', path: ROUTES.profile, icon: <Person /> },
];
