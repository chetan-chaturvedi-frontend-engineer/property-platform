import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import EditOutlined from '@mui/icons-material/EditOutlined';
import PauseCircleOutline from '@mui/icons-material/PauseCircleOutline';
import PlayCircleOutline from '@mui/icons-material/PlayCircleOutline';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import type { DataTableColumn } from '@/components/common/DataTable/DataTable';
import { RowMenu, type RowMenuAction } from '@/components/common/RowMenu';

import type { Banner, BannerSortField, BannerStatus } from '../types/banner.types';
import { bannerPlacementLabel, bannerTypeLabel } from '../utils/bannerOptions';

import { BannerScheduleCell } from './BannerScheduleCell';
import { BannerStatusChip } from './BannerStatusChip';
import { BannerThumbnail } from './BannerThumbnail';

/** Handlers for the row actions; only the actions the viewer is permitted to use are passed in. */
export interface BannerRowActions {
  onView?: (banner: Banner) => void;
  onEdit?: (banner: Banner) => void;
  onDuplicate?: (banner: Banner) => void;
  onChangeStatus?: (banner: Banner, status: BannerStatus) => void;
  onDelete?: (banner: Banner) => void;
}

type BannerColumn = DataTableColumn<Banner> & { sortField?: BannerSortField };

export function bannerRowActions(banner: Banner, handlers: BannerRowActions): RowMenuAction[] {
  const actions: Array<RowMenuAction | false | undefined> = [
    handlers.onView && {
      key: 'view',
      label: 'View details',
      icon: <VisibilityOutlined fontSize="small" />,
      onSelect: () => handlers.onView?.(banner),
    },
    handlers.onEdit && {
      key: 'edit',
      label: 'Edit',
      icon: <EditOutlined fontSize="small" />,
      onSelect: () => handlers.onEdit?.(banner),
    },
    handlers.onDuplicate && {
      key: 'duplicate',
      label: 'Duplicate',
      icon: <ContentCopyOutlined fontSize="small" />,
      onSelect: () => handlers.onDuplicate?.(banner),
    },
    handlers.onChangeStatus &&
      (banner.status === 'inactive'
        ? {
            key: 'activate',
            label: 'Activate',
            icon: <PlayCircleOutline fontSize="small" />,
            onSelect: () => handlers.onChangeStatus?.(banner, 'active'),
          }
        : {
            key: 'deactivate',
            label: 'Deactivate',
            icon: <PauseCircleOutline fontSize="small" />,
            onSelect: () => handlers.onChangeStatus?.(banner, 'inactive'),
          }),
    handlers.onDelete && {
      key: 'delete',
      label: 'Delete',
      icon: <DeleteOutline fontSize="small" />,
      tone: 'danger',
      onSelect: () => handlers.onDelete?.(banner),
    },
  ];
  return actions.filter((action): action is RowMenuAction => Boolean(action));
}

/** Only API-sortable columns get a sort toggle. */
export function buildBannerColumns(handlers: BannerRowActions): BannerColumn[] {
  return [
    {
      id: 'banner',
      header: 'Banner',
      sortField: 'title',
      cell: (banner) => (
        <div className="flex min-w-64 flex-col gap-1.5 py-2">
          <BannerThumbnail src={banner.imageUrl} alt={banner.title} className="w-56 max-w-full" />
          <div className="min-w-0">
            <Typography variant="body2" fontWeight={600} noWrap title={banner.title}>
              {banner.title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              #{banner.id}
            </Typography>
          </div>
        </div>
      ),
    },
    {
      id: 'type',
      header: 'Banner type',
      sortField: 'type',
      cell: (banner) => (
        <Chip
          size="small"
          label={bannerTypeLabel(banner.type)}
          className="font-medium"
          sx={{
            bgcolor: 'rgba(var(--mui-palette-primary-mainChannel) / 0.1)',
            color: 'primary.main',
          }}
        />
      ),
    },
    {
      id: 'placement',
      header: 'Placement',
      sortField: 'placement',
      cell: (banner) => (
        <span className="whitespace-nowrap">{bannerPlacementLabel(banner.placement)}</span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      sortField: 'status',
      cell: (banner) => <BannerStatusChip state={banner.displayState} />,
    },
    {
      id: 'schedule',
      header: 'Schedule',
      sortField: 'startDate',
      align: 'center',
      cell: (banner) => <BannerScheduleCell banner={banner} />,
    },
    {
      id: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (banner) => (
        <div className="flex items-center justify-end gap-1.5">
          {handlers.onEdit && (
            <Tooltip title="Edit">
              <IconButton
                size="small"
                aria-label={`Edit ${banner.title}`}
                onClick={() => handlers.onEdit?.(banner)}
                className="rounded-lg border"
                color="primary"
              >
                <EditOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <RowMenu
            label={`Actions for ${banner.title}`}
            actions={bannerRowActions(banner, handlers)}
          />
        </div>
      ),
    },
  ];
}
