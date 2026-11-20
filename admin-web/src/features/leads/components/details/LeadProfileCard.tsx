import EmailOutlined from '@mui/icons-material/EmailOutlined';
import EventOutlined from '@mui/icons-material/EventOutlined';
import PhoneOutlined from '@mui/icons-material/PhoneOutlined';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import Avatar from '@mui/material/Avatar';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { formatDateTime } from '@/utils/formatters';
import { getInitials } from '@/utils/helpers';

import type { Lead } from '../../types/lead.types';
import {
  bhkLabel,
  formatBudget,
  LEAD_PROPERTY_TYPE_LABELS,
  LEAD_PURPOSE_LABELS,
  LEAD_SOURCE_LABELS,
  userName,
} from '../../utils/leadDisplay';
import { LeadPriorityChip, LeadStatusChip } from '../LeadStatusChip';

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted text-xs">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold break-words">{children}</dd>
    </div>
  );
}

function IconLine({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <span aria-hidden className="text-muted flex">
        {icon}
      </span>
      <span className="min-w-0 break-words">{children}</span>
    </li>
  );
}

/** Header card: who the lead is and the facts a sales person needs at a glance. */
export function LeadProfileCard({ lead }: { lead: Lead }) {
  const interestedIn =
    [
      lead.bhk ? bhkLabel(lead.bhk) : null,
      lead.propertyType ? LEAD_PROPERTY_TYPE_LABELS[lead.propertyType] : null,
    ]
      .filter(Boolean)
      .join(' ') || '—';
  return (
    <Paper className="grid grid-cols-1 gap-6 p-5 md:grid-cols-[minmax(14rem,18rem)_1fr]">
      <div className="flex flex-col gap-3 md:border-r md:pr-6">
        <div className="flex items-center gap-3">
          <Avatar
            aria-hidden
            className="bg-primary-100 font-semibold text-primary-800 dark:bg-primary-500/15 dark:text-primary-300"
            sx={{ width: 56, height: 56, fontSize: 20 }}
          >
            {getInitials(lead.leadName)}
          </Avatar>
          <div className="flex flex-wrap gap-1">
            <LeadStatusChip status={lead.status} />
            <LeadPriorityChip priority={lead.priority} />
          </div>
        </div>
        <Typography variant="h5" component="h2" fontWeight={700} className="break-words">
          {lead.leadName}
        </Typography>
        <ul className="flex flex-col gap-1.5">
          <IconLine icon={<PhoneOutlined fontSize="small" />}>{lead.phone}</IconLine>
          {lead.email && (
            <IconLine icon={<EmailOutlined fontSize="small" />}>{lead.email}</IconLine>
          )}
          {lead.location && (
            <IconLine icon={<PlaceOutlined fontSize="small" />}>{lead.location}</IconLine>
          )}
        </ul>
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 xl:grid-cols-4">
        <Fact label="Lead ID">LID-{lead.id}</Fact>
        <Fact label="Source">{LEAD_SOURCE_LABELS[lead.source]}</Fact>
        <Fact label="Purpose">{LEAD_PURPOSE_LABELS[lead.purpose]}</Fact>
        <Fact label="Assigned to">{userName(lead.assignedTo, 'Unassigned')}</Fact>
        <Fact label="Interested in">{interestedIn}</Fact>
        <Fact label="Budget">
          {formatBudget(lead.budgetMin, lead.budgetMax, lead.budgetCurrency)}
        </Fact>
        <Fact label="Preferred location">{lead.preferredLocation ?? '—'}</Fact>
        <Fact label="Created on">{formatDateTime(lead.createdAt)}</Fact>
        <Fact label="Next follow-up">
          <span className="inline-flex items-center gap-1">
            {lead.nextFollowUpAt && <EventOutlined fontSize="inherit" aria-hidden />}
            {formatDateTime(lead.nextFollowUpAt)}
          </span>
        </Fact>
      </dl>
    </Paper>
  );
}
