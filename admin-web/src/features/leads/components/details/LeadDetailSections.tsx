import ChecklistOutlined from '@mui/icons-material/ChecklistOutlined';
import EmailOutlined from '@mui/icons-material/EmailOutlined';
import PhoneOutlined from '@mui/icons-material/PhoneOutlined';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import StickyNote2Outlined from '@mui/icons-material/StickyNote2Outlined';
import TuneOutlined from '@mui/icons-material/TuneOutlined';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { formatDateTime } from '@/utils/formatters';

import type { Lead } from '../../types/lead.types';
import {
  AREA_UNIT_LABELS,
  bhkLabel,
  FACING_LABELS,
  formatBudget,
  formatLocalDate,
  FURNISHING_LABELS,
  LEAD_PROPERTY_TYPE_LABELS,
  LEAD_PURPOSE_LABELS,
  PARKING_LABELS,
  POSSESSION_LABELS,
  slugLabel,
  userName,
} from '../../utils/leadDisplay';

interface DetailCardProps {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}

export function DetailCard({ title, icon, action, children }: DetailCardProps) {
  return (
    <Paper className="p-4" component="section" aria-label={title}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <Typography
          variant="subtitle1"
          component="h2"
          fontWeight={700}
          className="flex items-center gap-2"
        >
          {icon && (
            <span aria-hidden className="text-primary-strong flex">
              {icon}
            </span>
          )}
          {title}
        </Typography>
        {action}
      </div>
      {children}
    </Paper>
  );
}

/** Label/value pairs; empty values show a dash. */
export function DetailList({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <dl className="grid grid-cols-[minmax(7.5rem,auto)_1fr] gap-x-4 gap-y-2.5 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted">{label}</dt>
          <dd className="font-medium break-words">
            {value === null || value === '' ? '—' : value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

const orDash = <T extends string>(value: T | null, labels: Record<T, string>) =>
  value ? labels[value] : '—';

export function LeadRequirementsCard({ lead }: { lead: Lead }) {
  return (
    <DetailCard title="Requirements" icon={<ChecklistOutlined fontSize="small" />}>
      <DetailList
        rows={[
          ['Purpose', LEAD_PURPOSE_LABELS[lead.purpose]],
          ['Property type', orDash(lead.propertyType, LEAD_PROPERTY_TYPE_LABELS)],
          ['BHK', bhkLabel(lead.bhk)],
          ['Budget', formatBudget(lead.budgetMin, lead.budgetMax, lead.budgetCurrency)],
          [
            'Area',
            lead.area != null
              ? `${lead.area} ${lead.areaUnit ? AREA_UNIT_LABELS[lead.areaUnit] : ''}`.trim()
              : '—',
          ],
          ['Preferred location', lead.preferredLocation],
          ['Possession', orDash(lead.possession, POSSESSION_LABELS)],
          ['Move-in date', formatLocalDate(lead.moveInDate)],
        ]}
      />
    </DetailCard>
  );
}

interface LeadPreferencesCardProps {
  lead: Lead;
  /** Amenity names by slug; unknown slugs are shown humanized. */
  amenityNames?: ReadonlyMap<string, string>;
}

export function LeadPreferencesCard({ lead, amenityNames }: LeadPreferencesCardProps) {
  const amenities = lead.amenities ?? [];
  return (
    <DetailCard title="Interests & preferences" icon={<TuneOutlined fontSize="small" />}>
      <DetailList
        rows={[
          ['Floor preference', lead.floorPreference],
          ['Facing', orDash(lead.facing, FACING_LABELS)],
          ['Furnishing', orDash(lead.furnishing, FURNISHING_LABELS)],
          ['Parking', orDash(lead.parking, PARKING_LABELS)],
          ['Loan required', lead.loanRequired ? 'Yes' : 'No'],
          [
            'Amenities',
            amenities.length ? (
              <span className="flex flex-wrap gap-1">
                {amenities.map((slug) => (
                  <Chip
                    key={slug}
                    size="small"
                    label={amenityNames?.get(slug) ?? slugLabel(slug)}
                  />
                ))}
              </span>
            ) : null,
          ],
        ]}
      />
    </DetailCard>
  );
}

export function LeadNotesCard({ lead }: { lead: Lead }) {
  return (
    <DetailCard title="Notes" icon={<StickyNote2Outlined fontSize="small" />}>
      {lead.status === 'lost' && lead.lostReason && (
        <div className="mb-3">
          <Typography variant="caption" color="error" fontWeight={700}>
            Lost reason
          </Typography>
          <Typography variant="body2" className="whitespace-pre-line">
            {lead.lostReason}
          </Typography>
        </div>
      )}
      <Typography
        variant="body2"
        color={lead.additionalNote ? 'text.primary' : 'text.secondary'}
        className="whitespace-pre-line"
      >
        {lead.additionalNote ?? 'No notes yet.'}
      </Typography>
    </DetailCard>
  );
}

interface ContactRowProps {
  icon: ReactNode;
  value: string | null;
  /** `tel:`/`mailto:`/maps link built by the app (never a user-supplied URL). */
  href?: string;
  actionLabel: string;
  actionIcon: ReactNode;
}

function ContactRow({ icon, value, href, actionLabel, actionIcon }: ContactRowProps) {
  return (
    <li className="flex items-center gap-3 py-1.5">
      <span aria-hidden className="text-primary-strong flex">
        {icon}
      </span>
      <span className="min-w-0 flex-1 text-sm break-words">{value ?? '—'}</span>
      {value && href && (
        <Tooltip title={actionLabel}>
          <IconButton
            size="small"
            aria-label={actionLabel}
            href={href}
            target={href.startsWith('https:') ? '_blank' : undefined}
            rel={href.startsWith('https:') ? 'noopener noreferrer' : undefined}
          >
            {actionIcon}
          </IconButton>
        </Tooltip>
      )}
    </li>
  );
}

export function LeadContactCard({ lead }: { lead: Lead }) {
  const phone = <PhoneOutlined fontSize="small" />;
  return (
    <DetailCard title="Contact details">
      <ul>
        <ContactRow
          icon={phone}
          value={lead.phone}
          href={`tel:${lead.phone}`}
          actionLabel={`Call ${lead.phone}`}
          actionIcon={phone}
        />
        {lead.alternatePhone && (
          <ContactRow
            icon={phone}
            value={lead.alternatePhone}
            href={`tel:${lead.alternatePhone}`}
            actionLabel={`Call ${lead.alternatePhone}`}
            actionIcon={phone}
          />
        )}
        <ContactRow
          icon={<EmailOutlined fontSize="small" />}
          value={lead.email}
          href={lead.email ? `mailto:${lead.email}` : undefined}
          actionLabel="Send email"
          actionIcon={<EmailOutlined fontSize="small" />}
        />
        <ContactRow
          icon={<PlaceOutlined fontSize="small" />}
          value={lead.location}
          href={
            lead.location
              ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.location)}`
              : undefined
          }
          actionLabel="Open in maps"
          actionIcon={<PlaceOutlined fontSize="small" />}
        />
      </ul>
    </DetailCard>
  );
}

export function LeadRecordCard({ lead }: { lead: Lead }) {
  return (
    <DetailCard title="Record">
      <DetailList
        rows={[
          ['Created by', userName(lead.createdBy)],
          ['Assigned to', userName(lead.assignedTo, 'Unassigned')],
          ['Created on', formatDateTime(lead.createdAt)],
          ['Last updated', formatDateTime(lead.updatedAt)],
          ['Last contacted', formatDateTime(lead.lastContactedAt)],
          ['Next follow-up', formatDateTime(lead.nextFollowUpAt)],
        ]}
      />
    </DetailCard>
  );
}
