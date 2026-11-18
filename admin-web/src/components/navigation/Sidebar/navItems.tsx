import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import GroupOutlined from '@mui/icons-material/GroupOutlined';
import HistoryOutlined from '@mui/icons-material/HistoryOutlined';
import PersonOutline from '@mui/icons-material/PersonOutline';

import type { NavSection } from '@/types/common.types';
import { PERMISSIONS, ROUTES } from '@/utils/constants';

/** Every route the dashboard has. A section with no visible items is hidden. */
export const NAV_SECTIONS: readonly NavSection[] = [
  {
    items: [{ label: 'Dashboard', path: ROUTES.dashboard, icon: <DashboardOutlined /> }],
  },
  {
    title: 'Management',
    items: [
      {
        label: 'Users',
        path: ROUTES.users,
        icon: <GroupOutlined />,
        requiredPermissions: [PERMISSIONS.userList],
      },
    ],
  },
  {
    title: 'Monitoring',
    items: [
      {
        label: 'Activity log',
        path: ROUTES.activity,
        icon: <HistoryOutlined />,
        requiredPermissions: [PERMISSIONS.systemLogList],
      },
    ],
  },
  {
    title: 'Account',
    items: [{ label: 'Profile', path: ROUTES.profile, icon: <PersonOutline /> }],
  },
];
