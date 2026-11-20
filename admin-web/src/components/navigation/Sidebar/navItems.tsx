import ApartmentOutlined from '@mui/icons-material/ApartmentOutlined';
import ArticleOutlined from '@mui/icons-material/ArticleOutlined';
import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import GroupOutlined from '@mui/icons-material/GroupOutlined';
import HistoryOutlined from '@mui/icons-material/HistoryOutlined';
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined';
import PermMediaOutlined from '@mui/icons-material/PermMediaOutlined';
import PersonOutline from '@mui/icons-material/PersonOutline';
import SupportAgentOutlined from '@mui/icons-material/SupportAgentOutlined';

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
      {
        label: 'Properties',
        path: ROUTES.properties,
        icon: <ApartmentOutlined />,
        requiredPermissions: [PERMISSIONS.propertyListAny],
      },
      {
        label: 'Leads / Enquiries',
        path: ROUTES.leads,
        icon: <SupportAgentOutlined />,
        requiredPermissions: [PERMISSIONS.leadListAny],
      },
      {
        label: 'Site visits',
        path: ROUTES.siteVisits,
        icon: <EventAvailableOutlined />,
        requiredPermissions: [PERMISSIONS.siteVisitListAny],
      },
      {
        label: 'Packages & plans',
        path: ROUTES.subscriptionPlans,
        icon: <Inventory2Outlined />,
        requiredPermissions: [PERMISSIONS.subscriptionPlanList],
      },
    ],
  },
  {
    title: 'Content management',
    items: [
      {
        label: 'Banners',
        path: ROUTES.banners,
        icon: <PermMediaOutlined />,
        requiredPermissions: [PERMISSIONS.bannerList],
      },
      {
        label: 'Blogs',
        path: ROUTES.blogs,
        icon: <ArticleOutlined />,
        requiredPermissions: [PERMISSIONS.blogView],
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
