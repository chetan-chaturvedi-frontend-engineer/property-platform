import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { ConfirmDialog } from '@/components/common/Modal';
import { notify } from '@/store/notificationStore';

import { useChangePlanStatus } from '../hooks/useSubscriptionPlans';
import type { PlanStatus, SubscriptionPlan } from '../types/subscriptionPlan.types';
import { PLAN_STATUS_META } from '../utils/planDisplay';

interface PlanStatusDialogProps {
  plans: readonly SubscriptionPlan[];
  status: PlanStatus;
  onClose: () => void;
  /** Called with the ids that were changed. */
  onDone?: (ids: number[]) => void;
}

const VERBS: Record<PlanStatus, { title: string; action: string }> = {
  active: { title: 'Activate', action: 'activated' },
  inactive: { title: 'Deactivate', action: 'deactivated' },
  draft: { title: 'Move to draft', action: 'moved to draft' },
};

/**
 * Confirms a status change for one or more plans. There is no bulk endpoint, so a bulk change sends
 * one request per plan and reports the outcome once. Plans already in the target status are skipped.
 */
export function PlanStatusDialog({ plans, status, onClose, onDone }: PlanStatusDialogProps) {
  const targets = plans.filter((plan) => plan.status !== status);
  const isBulk = plans.length > 1;
  const change = useChangePlanStatus({ quiet: isBulk });
  const [progress, setProgress] = useState<number | null>(null);
  const verb = VERBS[status];
  const busy = progress !== null || change.isPending;
  const [single] = targets;

  const confirm = async () => {
    if (busy) return;
    if (targets.length === 0) {
      onClose();
      return;
    }
    if (!isBulk) {
      if (!single) return;
      change.mutate(
        { id: single.id, status },
        {
          onSuccess: () => {
            onDone?.([single.id]);
            onClose();
          },
        },
      );
      return;
    }
    setProgress(0);
    const changed: number[] = [];
    let failed = 0;
    for (const plan of targets) {
      try {
        await change.mutateAsync({ id: plan.id, status });
        changed.push(plan.id);
      } catch {
        failed += 1;
      }
      setProgress((value) => (value ?? 0) + 1);
    }
    notify(
      failed === 0
        ? `${changed.length} plan${changed.length === 1 ? '' : 's'} ${verb.action}.`
        : `${changed.length} ${verb.action}, ${failed} failed. Refresh and try again.`,
      failed === 0 ? 'success' : 'warning',
    );
    onDone?.(changed);
    onClose();
  };

  const subject = isBulk
    ? `${targets.length} plan${targets.length === 1 ? '' : 's'}`
    : `"${plans[0]?.title ?? ''}"`;

  return (
    <ConfirmDialog
      open
      title={`${verb.title} ${isBulk ? 'plans' : 'plan'}`}
      confirmLabel={verb.title}
      destructive={status === 'inactive'}
      loading={busy}
      onCancel={onClose}
      onConfirm={() => void confirm()}
      description={
        <div className="flex flex-col gap-3">
          {targets.length === 0 ? (
            <Typography variant="body2">
              The selected plans are already {PLAN_STATUS_META[status].label.toLowerCase()}.
            </Typography>
          ) : (
            <Typography variant="body2">
              {verb.title} {subject}? {PLAN_STATUS_META[status].description}
            </Typography>
          )}
          {isBulk && targets.length < plans.length && targets.length > 0 && (
            <Typography variant="caption" color="text.secondary">
              {plans.length - targets.length} already {PLAN_STATUS_META[status].label.toLowerCase()}{' '}
              will be skipped.
            </Typography>
          )}
          {status === 'inactive' && (
            <Typography variant="caption" color="text.secondary">
              Plans are never deleted, so subscription history stays intact. You can activate it
              again at any time.
            </Typography>
          )}
          {progress !== null && (
            <LinearProgress
              variant="determinate"
              value={(progress / Math.max(1, targets.length)) * 100}
              aria-label="Status change progress"
            />
          )}
        </div>
      }
    />
  );
}
