import LocationOnOutlined from '@mui/icons-material/LocationOnOutlined';
import Typography from '@mui/material/Typography';

import { Badge } from '@/components/common/Badge';
import { formatDateTime } from '@/utils/formatters';

import type { PropertySummary } from '../types/property.types';
import {
  areaInSqFt,
  formatApartmentTypes,
  formatDate,
  formatDateAndTime,
  formatInr,
  formatParking,
  formatPlace,
  formatPrice,
  formatSqFt,
  pricePerSqFt,
  PROPERTY_TYPE_LABELS,
} from '../utils/propertyDisplay';

import { PropertyMediaThumbnail } from './PropertyMediaThumbnail';
import { LegalStatusChip, PublicationStatusChip } from './PropertyStatusChips';

interface CellProps {
  property: PropertySummary;
}

/*
 * Columns that do not fit a narrow table are hidden (see `propertyColumns`), and their content is shown
 * inside the property cell instead, so nothing needs horizontal scrolling. The breakpoints here must match
 * the column classes there.
 */

function Secondary({
  children,
  title,
  className = '',
}: {
  children: string;
  title?: string;
  className?: string;
}) {
  return (
    <Typography
      variant="caption"
      color="text.secondary"
      component="p"
      noWrap
      title={title ?? children}
      className={className}
    >
      {children}
    </Typography>
  );
}

export function PropertyInfoCell({ property: p }: CellProps) {
  const sqFt = areaInSqFt(p.startingArea, p.startingAreaUnit);
  const parking = formatParking(p.carParkingMin, p.carParkingMax);
  const configs = formatApartmentTypes(p.apartmentTypes);
  const size = [sqFt !== null ? formatSqFt(sqFt) : null, parking].filter(Boolean).join(' · ');
  const submitted = formatDateAndTime(p.createdAt);
  return (
    <div className="flex max-w-[260px] min-w-[200px] items-start gap-2.5">
      <PropertyMediaThumbnail
        url={p.coverUrl}
        alt={p.projectName}
        mediaCount={p.mediaCount}
        className="h-12 w-16"
      />
      <div className="min-w-0 flex-1">
        <Typography variant="body2" fontWeight={600} noWrap title={p.projectName}>
          {p.projectName}
        </Typography>
        <div className="flex min-w-0 items-center gap-1">
          <Badge tone="primary" className="shrink-0 px-1.5 py-0 text-[11px]">
            {PROPERTY_TYPE_LABELS[p.propertyType]}
          </Badge>
          {configs && <Secondary>{configs}</Secondary>}
        </div>
        <Secondary title={p.reraNumber ? `RERA ${p.reraNumber}` : 'No RERA number'}>
          {`RERA ${p.reraNumber ?? '—'}`}
        </Secondary>
        {size && <Secondary>{size}</Secondary>}
        {/* Hidden-column content, shown only while that column is hidden. */}
        <Secondary className="xl:hidden">{formatPlace([p.city, p.state])}</Secondary>
        {submitted && (
          <Secondary className="lg:hidden">{`Submitted ${submitted.date}, ${submitted.time}`}</Secondary>
        )}
        <Secondary className="sm:hidden">{`${formatPrice(p.startingPrice)} · ${perSqFtLabel(p)}`}</Secondary>
        <div className="mt-1 flex flex-wrap gap-1 sm:hidden">
          <PublicationStatusChip status={p.publicationStatus} />
        </div>
      </div>
    </div>
  );
}

export function LocationCell({ property: p }: CellProps) {
  const area = formatPlace([p.locality, p.city]);
  return (
    <div className="flex max-w-[170px] items-start gap-1">
      <LocationOnOutlined
        aria-hidden
        className="mt-0.5 shrink-0 text-muted"
        sx={{ fontSize: 16 }}
      />
      <div className="min-w-0">
        <Typography variant="body2" noWrap title={p.projectAddress ?? area}>
          {p.projectAddress ?? area}
        </Typography>
        {p.projectAddress && <Secondary>{area}</Secondary>}
        <Secondary>{p.state ?? '—'}</Secondary>
      </div>
    </div>
  );
}

function perSqFtLabel(p: PropertySummary): string {
  const perSqFt = pricePerSqFt(p.startingPrice, p.startingArea, p.startingAreaUnit);
  return perSqFt === null ? '— / sq.ft' : `${formatInr(perSqFt)} / sq.ft`;
}

export function PriceCell({ property: p }: CellProps) {
  return (
    <div className="whitespace-nowrap">
      <Typography
        variant="body2"
        fontWeight={600}
        title={p.startingPrice == null ? undefined : `Starting from ${formatInr(p.startingPrice)}`}
      >
        {formatPrice(p.startingPrice)}
      </Typography>
      <Typography variant="caption" color="text.secondary" component="p">
        {perSqFtLabel(p)}
      </Typography>
    </div>
  );
}

/** "Submitted on" is when the listing was created. */
export function SubmittedOnCell({ property: p }: CellProps) {
  const submitted = formatDateAndTime(p.createdAt);
  if (!submitted) {
    return (
      <Typography variant="caption" color="text.secondary">
        —
      </Typography>
    );
  }
  return (
    <div className="whitespace-nowrap" title={formatDateTime(p.createdAt)}>
      <Typography variant="body2">{submitted.date}</Typography>
      <Typography variant="caption" color="text.secondary" component="p">
        {submitted.time}
      </Typography>
    </div>
  );
}

export function StatusCell({ property: p }: CellProps) {
  return (
    <div className="flex flex-col items-start gap-1">
      <PublicationStatusChip status={p.publicationStatus} />
      <LegalStatusChip status={p.legalApprovalStatus} />
      {p.deletedAt && (
        <Typography variant="caption" color="error" className="whitespace-nowrap">
          Deleted {formatDate(p.deletedAt)}
        </Typography>
      )}
    </div>
  );
}
