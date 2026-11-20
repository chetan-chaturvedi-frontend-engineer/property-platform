import type { EntityId } from '@/types/common.types';

import type { PlanStatus, SubscriptionPlan } from '../types/subscriptionPlan.types';

import { PlanComparisonDialog } from './PlanComparisonDialog';
import { PlanDetailsDrawer } from './PlanDetailsDrawer';
import { PlanFormDialog } from './PlanFormDialog';
import { PlanLoader } from './PlanLoader';
import { PlanStatusDialog } from './PlanStatusDialog';

/** The one dialog (or drawer) open on the page. */
export type ActivePlanDialog =
  | { kind: 'create' }
  | { kind: 'view'; id: EntityId }
  | { kind: 'edit'; id: EntityId }
  | { kind: 'duplicate'; plan: SubscriptionPlan }
  | { kind: 'status'; plans: SubscriptionPlan[]; status: PlanStatus }
  | { kind: 'compare'; plans: SubscriptionPlan[] };

interface PlanDialogsProps {
  dialog: ActivePlanDialog | null;
  onChange: (dialog: ActivePlanDialog | null) => void;
  /** Edit is offered from the details drawer only when allowed. */
  canEdit?: boolean;
  /** Called after a bulk status change, e.g. to clear the selection. */
  onBulkDone?: () => void;
}

export function PlanDialogs({ dialog, onChange, canEdit = false, onBulkDone }: PlanDialogsProps) {
  const close = () => onChange(null);
  if (!dialog) return null;

  switch (dialog.kind) {
    case 'create':
      return <PlanFormDialog mode={{ kind: 'create' }} onClose={close} />;
    case 'duplicate':
      return <PlanFormDialog mode={{ kind: 'duplicate', source: dialog.plan }} onClose={close} />;
    case 'view':
      return (
        <PlanDetailsDrawer
          planId={dialog.id}
          onClose={close}
          onEdit={canEdit ? (plan) => onChange({ kind: 'edit', id: plan.id }) : undefined}
        />
      );
    case 'edit':
      return (
        <PlanLoader planId={dialog.id} title="Edit plan" onClose={close}>
          {(plan) => <PlanFormDialog mode={{ kind: 'edit', plan }} onClose={close} />}
        </PlanLoader>
      );
    case 'status':
      return (
        <PlanStatusDialog
          plans={dialog.plans}
          status={dialog.status}
          onClose={close}
          onDone={dialog.plans.length > 1 ? onBulkDone : undefined}
        />
      );
    case 'compare':
      return <PlanComparisonDialog plans={dialog.plans} onClose={close} />;
  }
}
