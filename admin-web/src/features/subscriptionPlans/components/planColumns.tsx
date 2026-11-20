import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined';
import PauseCircleOutline from '@mui/icons-material/PauseCircleOutline';
import PlayCircleOutline from '@mui/icons-material/PlayCircleOutline';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import Typography from '@mui/material/Typography';

import type { DataTableColumn } from '@/components/common/DataTable/DataTable';
import { RowMenu, type RowMenuAction } from '@/components/common/RowMenu';
import { formatDateTime } from '@/utils/formatters';

import type { PlanSortField, SubscriptionPlan } from '../types/subscriptionPlan.types';
import {
  billingCycleLabel,
  monthlyEquivalent,
  planPriceLabel,
  propertyLimitLabel,
  teamLimitLabel,
  trialLabel,
} from '../utils/planDisplay';

import { PlanStatusChip, PopularChip } from './PlanStatusChip';

/** Handlers for the row menu; only the actions the viewer is permitted to use are passed in. */
export interface PlanRowActions {
  onView?: (plan: SubscriptionPlan) => void;
  onEdit?: (plan: SubscriptionPlan) => void;
  onDuplicate?: (plan: SubscriptionPlan) => void;
  onChangeStatus?: (plan: SubscriptionPlan, status: 'active' | 'inactive') => void;
}

type PlanColumn = DataTableColumn<SubscriptionPlan> & { sortField?: PlanSortField };

/** Menu entries for this plan; plans are retired (deactivated), never deleted. */
export function planRowActions(plan: SubscriptionPlan, handlers: PlanRowActions): RowMenuAction[] {
  const actions: Array<RowMenuAction | false | undefined> = [
    handlers.onView && {
      key: 'view',
      label: 'View details',
      icon: <VisibilityOutlined fontSize="small" />,
      onSelect: () => handlers.onView?.(plan),
    },
    handlers.onEdit && {
      key: 'edit',
      label: 'Edit',
      icon: <EditOutlined fontSize="small" />,
      onSelect: () => handlers.onEdit?.(plan),
    },
    handlers.onDuplicate && {
      key: 'duplicate',
      label: 'Duplicate',
      icon: <ContentCopyOutlined fontSize="small" />,
      onSelect: () => handlers.onDuplicate?.(plan),
    },
    plan.status !== 'active' &&
      handlers.onChangeStatus && {
        key: 'activate',
        label: 'Activate',
        icon: <PlayCircleOutline fontSize="small" />,
        onSelect: () => handlers.onChangeStatus?.(plan, 'active'),
      },
    plan.status !== 'inactive' &&
      handlers.onChangeStatus && {
        key: 'deactivate',
        label: 'Deactivate',
        icon: <PauseCircleOutline fontSize="small" />,
        tone: 'danger',
        onSelect: () => handlers.onChangeStatus?.(plan, 'inactive'),
      },
  ];
  return actions.filter((action): action is RowMenuAction => Boolean(action));
}

/** Only API-sortable columns get a sort toggle. */
export function buildPlanColumns(handlers: PlanRowActions): PlanColumn[] {
  return [
    {
      id: 'title',
      header: 'Plan',
      sortField: 'title',
      cell: (plan) => (
        <div className="flex min-w-52 items-center gap-3">
          <span
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300"
          >
            <Inventory2Outlined fontSize="small" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Typography variant="body2" fontWeight={600} noWrap>
                {plan.title}
              </Typography>
              {plan.popular && <PopularChip />}
            </div>
            <Typography variant="caption" color="text.secondary" noWrap component="p">
              {plan.slug}
            </Typography>
          </div>
        </div>
      ),
    },
    {
      id: 'price',
      header: 'Price',
      sortField: 'price',
      cell: (plan) => {
        const perMonth = monthlyEquivalent(plan);
        return (
          <div className="whitespace-nowrap">
            <Typography variant="body2" fontWeight={600}>
              {planPriceLabel(plan)}
            </Typography>
            {perMonth && (
              <Typography variant="caption" color="text.secondary">
                ≈ {perMonth}
              </Typography>
            )}
          </div>
        );
      },
    },
    {
      id: 'billing',
      header: 'Billing cycle',
      cell: (plan) => (
        <div className="whitespace-nowrap">
          <Typography variant="body2">
            {billingCycleLabel(plan.billingInterval, plan.billingIntervalCount)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {trialLabel(plan.trialDays)}
          </Typography>
        </div>
      ),
    },
    {
      id: 'limits',
      header: 'Limits',
      cell: (plan) => (
        <div className="whitespace-nowrap">
          <Typography variant="body2">
            {propertyLimitLabel(plan.noOfProperties)} properties
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Team: {teamLimitLabel(plan.noOfTeamMembers)}
          </Typography>
        </div>
      ),
    },
    {
      id: 'features',
      header: 'Features',
      cell: (plan) => (
        <Typography variant="body2" color="text.secondary" className="whitespace-nowrap">
          {plan.features.length === 0
            ? 'None listed'
            : `${plan.features.length} feature${plan.features.length === 1 ? '' : 's'}`}
        </Typography>
      ),
    },
    {
      id: 'sortOrder',
      header: 'Order',
      sortField: 'sortOrder',
      align: 'right',
      cell: (plan) => plan.sortOrder,
    },
    {
      id: 'status',
      header: 'Status',
      cell: (plan) => <PlanStatusChip status={plan.status} />,
    },
    {
      id: 'createdAt',
      header: 'Created',
      sortField: 'createdAt',
      cell: (plan) => <span className="whitespace-nowrap">{formatDateTime(plan.createdAt)}</span>,
    },
    {
      id: 'actions',
      header: 'Action',
      align: 'right',
      cell: (plan) => (
        <RowMenu label={`Actions for ${plan.title}`} actions={planRowActions(plan, handlers)} />
      ),
    },
  ];
}
