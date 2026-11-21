import AdminPanelSettingsOutlined from '@mui/icons-material/AdminPanelSettingsOutlined';
import ApartmentOutlined from '@mui/icons-material/ApartmentOutlined';
import ArticleOutlined from '@mui/icons-material/ArticleOutlined';
import CategoryOutlined from '@mui/icons-material/CategoryOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import EventNoteOutlined from '@mui/icons-material/EventNoteOutlined';
import ForumOutlined from '@mui/icons-material/ForumOutlined';
import GroupOutlined from '@mui/icons-material/GroupOutlined';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import HelpOutlineOutlined from '@mui/icons-material/HelpOutlineOutlined';
import HistoryOutlined from '@mui/icons-material/HistoryOutlined';
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined';
import PermMediaOutlined from '@mui/icons-material/PermMediaOutlined';
import ShieldOutlined from '@mui/icons-material/ShieldOutlined';
import SupportAgentOutlined from '@mui/icons-material/SupportAgentOutlined';
import TuneOutlined from '@mui/icons-material/TuneOutlined';
import type { ReactElement } from 'react';

const PROPS = { fontSize: 'small', color: 'action', 'aria-hidden': true } as const;

/** Icons for the catalog's current modules; a module added later gets the generic icon. */
const ICONS: Record<string, ReactElement> = {
  admin_panel: <AdminPanelSettingsOutlined {...PROPS} />,
  role: <ShieldOutlined {...PROPS} />,
  user: <GroupOutlined {...PROPS} />,
  user_setting: <TuneOutlined {...PROPS} />,
  property: <ApartmentOutlined {...PROPS} />,
  lead: <SupportAgentOutlined {...PROPS} />,
  lead_schedule: <EventNoteOutlined {...PROPS} />,
  lead_interaction: <ForumOutlined {...PROPS} />,
  site_visit: <EventAvailableOutlined {...PROPS} />,
  builder_team: <GroupsOutlined {...PROPS} />,
  builder_team_membership: <GroupsOutlined {...PROPS} />,
  subscription_plan: <Inventory2Outlined {...PROPS} />,
  banner: <PermMediaOutlined {...PROPS} />,
  blog_category: <CategoryOutlined {...PROPS} />,
  blog: <ArticleOutlined {...PROPS} />,
  faq: <HelpOutlineOutlined {...PROPS} />,
  page: <DescriptionOutlined {...PROPS} />,
  system_log: <HistoryOutlined {...PROPS} />,
};

interface ModuleIconProps {
  /** Permission catalog module key, e.g. `site_visit`. */
  moduleKey: string;
}

export function ModuleIcon({ moduleKey }: ModuleIconProps) {
  return ICONS[moduleKey] ?? <ShieldOutlined {...PROPS} />;
}
