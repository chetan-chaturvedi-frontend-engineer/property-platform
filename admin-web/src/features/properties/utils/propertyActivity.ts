import ArchiveOutlined from '@mui/icons-material/ArchiveOutlined';
import BlockOutlined from '@mui/icons-material/BlockOutlined';
import CancelOutlined from '@mui/icons-material/CancelOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import EditNoteOutlined from '@mui/icons-material/EditNoteOutlined';
import GavelOutlined from '@mui/icons-material/GavelOutlined';
import NoteAddOutlined from '@mui/icons-material/NoteAddOutlined';
import PlayCircleOutline from '@mui/icons-material/PlayCircleOutline';
import PublicOutlined from '@mui/icons-material/PublicOutlined';
import RestoreFromTrash from '@mui/icons-material/RestoreFromTrash';
import SendOutlined from '@mui/icons-material/SendOutlined';
import TaskAltOutlined from '@mui/icons-material/TaskAltOutlined';
import VisibilityOffOutlined from '@mui/icons-material/VisibilityOffOutlined';
import type { SvgIconComponent } from '@mui/icons-material';

import type { BadgeTone } from '@/components/common/Badge';

import type { PropertyActivity, StatusChangeAction } from '../types/property.types';

export interface ActivityMeta {
  label: string;
  icon: SvgIconComponent;
  tone: BadgeTone;
}

const ACTIVITY_META: Record<Exclude<StatusChangeAction, 'legal_status_changed'>, ActivityMeta> = {
  created: { label: 'New draft created', icon: NoteAddOutlined, tone: 'neutral' },
  submitted: { label: 'Submitted for review', icon: SendOutlined, tone: 'info' },
  approved: { label: 'Property approved', icon: TaskAltOutlined, tone: 'success' },
  rejected: { label: 'Property rejected', icon: CancelOutlined, tone: 'error' },
  published: { label: 'Property published', icon: PublicOutlined, tone: 'secondary' },
  unpublished: { label: 'Property unpublished', icon: VisibilityOffOutlined, tone: 'neutral' },
  suspended: { label: 'Property suspended', icon: BlockOutlined, tone: 'error' },
  resumed: { label: 'Suspension lifted', icon: PlayCircleOutline, tone: 'info' },
  archived: { label: 'Property archived', icon: ArchiveOutlined, tone: 'neutral' },
  reverted_to_draft: {
    label: 'Updated by owner, back to draft',
    icon: EditNoteOutlined,
    tone: 'warning',
  },
  deleted: { label: 'Property deleted', icon: DeleteOutline, tone: 'error' },
  restored: { label: 'Property restored', icon: RestoreFromTrash, tone: 'info' },
};

const LEGAL_META: Record<string, ActivityMeta> = {
  pending: { label: 'Sent for legal review', icon: GavelOutlined, tone: 'warning' },
  approved: { label: 'Legal review approved', icon: GavelOutlined, tone: 'success' },
  rejected: { label: 'Legal review rejected', icon: GavelOutlined, tone: 'error' },
  not_applicable: { label: 'Legal review not applicable', icon: GavelOutlined, tone: 'neutral' },
};

const LEGAL_FALLBACK: ActivityMeta = {
  label: 'Legal status changed',
  icon: GavelOutlined,
  tone: 'neutral',
};

/** Description, icon and color of one activity entry. */
export function activityMeta(
  activity: Pick<PropertyActivity, 'action' | 'toStatus'>,
): ActivityMeta {
  if (activity.action === 'legal_status_changed') {
    return (activity.toStatus && LEGAL_META[activity.toStatus]) || LEGAL_FALLBACK;
  }
  return ACTIVITY_META[activity.action];
}
