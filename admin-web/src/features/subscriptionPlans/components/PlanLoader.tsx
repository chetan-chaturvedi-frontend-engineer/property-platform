import Skeleton from '@mui/material/Skeleton';
import type { ReactNode } from 'react';

import { Button } from '@/components/common/Button';
import { ErrorState } from '@/components/common/Feedback/ErrorState';
import { Modal } from '@/components/common/Modal';
import type { EntityId } from '@/types/common.types';

import { useSubscriptionPlan } from '../hooks/useSubscriptionPlans';
import type { SubscriptionPlan } from '../types/subscriptionPlan.types';

interface PlanLoaderProps {
  planId: EntityId;
  /** Title of the placeholder dialog while loading or on error. */
  title: string;
  onClose: () => void;
  /** Rendered once the current plan is loaded, so edits start from fresh values. */
  children: (plan: SubscriptionPlan) => ReactNode;
}

export function PlanLoader({ planId, title, onClose, children }: PlanLoaderProps) {
  const { data: plan, isPending, error, refetch } = useSubscriptionPlan(planId);

  if (plan) return <>{children(plan)}</>;

  return (
    <Modal
      open
      title={title}
      onClose={onClose}
      actions={
        <Button variant="text" onClick={onClose}>
          Cancel
        </Button>
      }
    >
      {isPending ? (
        <div className="flex flex-col gap-3 pt-2" aria-busy aria-label="Loading plan">
          <Skeleton variant="rounded" height={44} />
          <Skeleton variant="rounded" height={44} />
          <Skeleton variant="rounded" height={44} />
        </div>
      ) : (
        <ErrorState
          message={
            error?.status === 404
              ? 'This plan does not exist.'
              : (error?.message ?? 'Could not load the plan.')
          }
          onRetry={error?.status === 404 ? undefined : () => void refetch()}
        />
      )}
    </Modal>
  );
}
