import Close from '@mui/icons-material/Close';
import EditOutlined from '@mui/icons-material/EditOutlined';
import PrintOutlined from '@mui/icons-material/PrintOutlined';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Rating from '@mui/material/Rating';
import Skeleton from '@mui/material/Skeleton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { Button } from '@/components/common/Button';
import { ErrorState } from '@/components/common/Feedback/ErrorState';
import type { EntityId } from '@/types/common.types';
import { formatDateTime } from '@/utils/formatters';

import { useSiteVisit } from '../hooks/useSiteVisits';
import type { SiteVisit } from '../types/siteVisit.types';
import {
  formatVisitDate,
  formatVisitTime,
  propertyPlace,
  SITE_VISIT_INTEREST_META,
  SITE_VISIT_TIME_ZONE,
  SITE_VISIT_TYPE_LABELS,
  userName,
} from '../utils/siteVisitDisplay';

import { SiteVisitStatusChip } from './SiteVisitStatusChip';

interface SiteVisitDetailsDrawerProps {
  visitId: EntityId;
  onClose: () => void;
  /** Shows an Edit button that hands over to the edit dialog. */
  onEdit?: (visit: SiteVisit) => void;
}

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

function VisitDetails({ visit }: { visit: SiteVisit }) {
  const report = visit.report;
  return (
    <div className="flex flex-col gap-5">
      <Section title="Visit">
        <Field label="Visit ID">{visit.visitCode}</Field>
        <Field label="Status">
          <SiteVisitStatusChip status={visit.status} />
        </Field>
        <Field label={`Date and time (${SITE_VISIT_TIME_ZONE})`}>
          {formatVisitDate(visit.visitDate)}, {formatVisitTime(visit.visitTime)}
        </Field>
        <Field label="Type">{SITE_VISIT_TYPE_LABELS[visit.visitType]}</Field>
        <Field label="Number of people">{visit.numberOfPeople}</Field>
        <Field label="Assigned agent">
          {userName(visit.assignee, 'Unassigned')}
          {visit.assignedAt && (
            <span className="text-muted block text-xs">
              since {formatDateTime(visit.assignedAt)}
            </span>
          )}
        </Field>
        {visit.actualVisitDate && (
          <Field label="Visited at">{formatDateTime(visit.actualVisitDate)}</Field>
        )}
        {visit.cancelledAt && (
          <Field label="Cancelled at">{formatDateTime(visit.cancelledAt)}</Field>
        )}
        {visit.cancellationReason && (
          <Field label="Cancellation reason" wide>
            {visit.cancellationReason}
          </Field>
        )}
        <Field label="Notes" wide>
          {visit.note}
        </Field>
      </Section>
      <Divider />
      <Section title="Visitor">
        <Field label="Name">{visit.name}</Field>
        <Field label="Contact number">{visit.mobile}</Field>
        <Field label="Email">{visit.email}</Field>
        <Field label="Customer account">{userName(visit.customer, 'None (walk-in)')}</Field>
        <Field label="Lead">{visit.leadId ? `LID-${visit.leadId}` : 'Not linked'}</Field>
      </Section>
      <Divider />
      <Section title="Property">
        <Field label="Project">{visit.property.projectName ?? 'Deleted property'}</Field>
        <Field label="Location">{propertyPlace(visit.property)}</Field>
        <Field label="Builder">{userName(visit.builder)}</Field>
      </Section>
      <Divider />
      <Section title="Follow-up">
        <Field label="Next follow-up">{formatDateTime(visit.nextFollowUp)}</Field>
        <Field label="Remarks" wide>
          {visit.followUpNote}
        </Field>
      </Section>
      {report && (
        <>
          <Divider />
          <Section title="Visit report">
            <Field label="Interest">{SITE_VISIT_INTEREST_META[report.interest].label}</Field>
            <Field label="Rating">
              {report.rating ? (
                <Rating
                  value={report.rating}
                  readOnly
                  size="small"
                  aria-label={`${report.rating} of 5`}
                />
              ) : null}
            </Field>
            <Field label="Duration">{report.duration ? `${report.duration} min` : null}</Field>
            <Field label="Visited with">{report.visitedWith}</Field>
            <Field label="Visit note" wide>
              {report.visitNote}
            </Field>
            <Field label="Feedback" wide>
              {report.feedback}
            </Field>
            <Field label="Submitted by">{userName(report.submittedBy)}</Field>
          </Section>
        </>
      )}
      <Divider />
      <Section title="Record">
        <Field label="Scheduled by">{userName(visit.scheduledBy)}</Field>
        <Field label="Created">{formatDateTime(visit.createdAt)}</Field>
        <Field label="Last updated">{formatDateTime(visit.updatedAt)}</Field>
      </Section>
    </div>
  );
}

/** Every detail of one visit, in a side drawer that can be printed on its own. */
export function SiteVisitDetailsDrawer({ visitId, onClose, onEdit }: SiteVisitDetailsDrawerProps) {
  const { data: visit, isPending, error, refetch } = useSiteVisit(visitId);

  return (
    <Drawer anchor="right" open onClose={onClose}>
      <div data-print-root className="flex w-[min(36rem,100vw)] flex-col gap-4 p-5">
        <header className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <Typography variant="h6" component="h2">
              Site visit {visit ? visit.visitCode : 'details'}
            </Typography>
            {visit && (
              <Typography variant="body2" color="text.secondary" noWrap>
                {visit.name} · {visit.property.projectName ?? 'Deleted property'}
              </Typography>
            )}
          </div>
          <div data-print-hide className="flex gap-1">
            {visit && (
              <Tooltip title="Print">
                <IconButton aria-label="Print visit details" onClick={() => window.print()}>
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
        {visit ? (
          <>
            <VisitDetails visit={visit} />
            {onEdit && (
              <div data-print-hide>
                <Button startIcon={<EditOutlined />} onClick={() => onEdit(visit)}>
                  Edit visit
                </Button>
              </div>
            )}
          </>
        ) : isPending ? (
          <div className="flex flex-col gap-3" aria-busy aria-label="Loading site visit">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} variant="rounded" height={40} />
            ))}
          </div>
        ) : (
          <ErrorState
            message={
              error?.status === 404
                ? 'This site visit does not exist or has been deleted.'
                : (error?.message ?? 'Could not load the site visit.')
            }
            onRetry={error?.status === 404 ? undefined : () => void refetch()}
          />
        )}
      </div>
    </Drawer>
  );
}
