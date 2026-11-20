import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import Close from '@mui/icons-material/Close';
import EditOutlined from '@mui/icons-material/EditOutlined';
import PrintOutlined from '@mui/icons-material/PrintOutlined';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Skeleton from '@mui/material/Skeleton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { Button } from '@/components/common/Button';
import { ErrorState } from '@/components/common/Feedback/ErrorState';
import type { EntityId } from '@/types/common.types';
import { formatDateTime } from '@/utils/formatters';
import { sanitizeUrl } from '@/utils/security';

import { useSubscriptionPlan } from '../hooks/useSubscriptionPlans';
import type { SubscriptionPlan } from '../types/subscriptionPlan.types';
import {
  billingCycleLabel,
  formatPrice,
  monthlyEquivalent,
  planPriceLabel,
  propertyLimitLabel,
  teamLimitLabel,
  trialLabel,
} from '../utils/planDisplay';

import { PlanStatusChip, PopularChip } from './PlanStatusChip';

interface FieldProps {
  label: string;
  children: ReactNode;
  /** Spans both columns (long text). */
  wide?: boolean;
}

function Field({ label, children, wide = false }: FieldProps) {
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <dt className="text-muted text-xs font-medium">{label}</dt>
      <dd className="mt-0.5 text-sm break-words whitespace-pre-line">{children ?? '—'}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <Typography variant="subtitle2" component="h3" fontWeight={700}>
        {title}
      </Typography>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

/** Photo values are https URLs or storage keys; only an https URL can be linked safely. */
function PhotoValue({ photo }: { photo: string | null }) {
  if (!photo) return null;
  const url = photo.startsWith('https://') ? sanitizeUrl(photo) : null;
  return url ? (
    <Link href={url} target="_blank" rel="noopener noreferrer">
      {photo}
    </Link>
  ) : (
    <>{photo}</>
  );
}

function PlanDetails({ plan }: { plan: SubscriptionPlan }) {
  const perMonth = monthlyEquivalent(plan);
  return (
    <div className="flex flex-col gap-5">
      <Section title="Plan">
        <Field label="Status">
          <PlanStatusChip status={plan.status} />
        </Field>
        <Field label="Popular">{plan.popular ? <PopularChip /> : 'No'}</Field>
        <Field label="Slug">{plan.slug}</Field>
        <Field label="Display order">{plan.sortOrder}</Field>
        <Field label="Icon">{plan.icon}</Field>
        <Field label="Photo">
          <PhotoValue photo={plan.photo} />
        </Field>
        <Field label="Description" wide>
          {plan.description}
        </Field>
      </Section>
      <Divider />
      <Section title="Pricing">
        <Field label="Price">{formatPrice(plan.price, plan.currency)}</Field>
        <Field label="Currency">{plan.currency}</Field>
        <Field label="Billing cycle">
          {billingCycleLabel(plan.billingInterval, plan.billingIntervalCount)}
        </Field>
        <Field label="Charged">
          {planPriceLabel(plan)}
          {perMonth && <span className="text-muted block text-xs">≈ {perMonth}</span>}
        </Field>
        <Field label="Trial period">{trialLabel(plan.trialDays)}</Field>
      </Section>
      <Divider />
      <Section title="Limits">
        <Field label="Active property listings">{propertyLimitLabel(plan.noOfProperties)}</Field>
        <Field label="Team members">{teamLimitLabel(plan.noOfTeamMembers)}</Field>
      </Section>
      <Divider />
      <section aria-label="Included features" className="flex flex-col gap-3">
        <Typography variant="subtitle2" component="h3" fontWeight={700}>
          Included features ({plan.features.length})
        </Typography>
        {plan.features.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No features listed.
          </Typography>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm">
                <CheckCircleOutline fontSize="small" color="success" aria-hidden />
                <span className="break-words">{feature}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Divider />
      <Section title="Record">
        <Field label="Plan ID">{plan.id}</Field>
        <Field label="Created">{formatDateTime(plan.createdAt)}</Field>
        <Field label="Last updated">{formatDateTime(plan.updatedAt)}</Field>
      </Section>
    </div>
  );
}

interface PlanDetailsDrawerProps {
  planId: EntityId;
  onClose: () => void;
  /** Shows an Edit button that hands over to the edit dialog. */
  onEdit?: (plan: SubscriptionPlan) => void;
}

/** Every detail of one plan, in a side drawer that can be printed on its own. */
export function PlanDetailsDrawer({ planId, onClose, onEdit }: PlanDetailsDrawerProps) {
  const { data: plan, isPending, error, refetch } = useSubscriptionPlan(planId);

  return (
    <Drawer anchor="right" open onClose={onClose}>
      <div data-print-root className="flex w-[min(36rem,100vw)] flex-col gap-4 p-5">
        <header className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <Typography variant="h6" component="h2">
              {plan ? plan.title : 'Plan details'}
            </Typography>
            {plan && (
              <Typography variant="body2" color="text.secondary" noWrap>
                {planPriceLabel(plan)} ·{' '}
                {billingCycleLabel(plan.billingInterval, plan.billingIntervalCount)}
              </Typography>
            )}
          </div>
          <div data-print-hide className="flex gap-1">
            {plan && (
              <Tooltip title="Print">
                <IconButton aria-label="Print plan details" onClick={() => window.print()}>
                  <PrintOutlined />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Close">
              <IconButton aria-label="Close details" onClick={onClose}>
                <Close />
              </IconButton>
            </Tooltip>
          </div>
        </header>
        {plan ? (
          <>
            <PlanDetails plan={plan} />
            {onEdit && (
              <div data-print-hide>
                <Button startIcon={<EditOutlined />} onClick={() => onEdit(plan)}>
                  Edit plan
                </Button>
              </div>
            )}
          </>
        ) : isPending ? (
          <div className="flex flex-col gap-3" aria-busy aria-label="Loading plan">
            <Skeleton variant="rounded" height={88} />
            <Skeleton variant="rounded" height={120} />
            <Skeleton variant="rounded" height={88} />
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
      </div>
    </Drawer>
  );
}
