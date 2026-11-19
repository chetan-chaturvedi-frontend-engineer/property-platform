import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import MapOutlined from '@mui/icons-material/MapOutlined';
import OpenInNew from '@mui/icons-material/OpenInNew';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import ThreeSixtyOutlined from '@mui/icons-material/ThreeSixtyOutlined';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { EmptyState } from '@/components/common/Feedback/EmptyState';
import { formatBytes, formatDateTime } from '@/utils/formatters';
import { sanitizeUrl } from '@/utils/security';

import type { AmenityResponse, MediaResponse, Property } from '../../types/property.types';
import {
  APARTMENT_TYPE_LABELS,
  AREA_UNIT_LABELS,
  formatDate,
  formatPlace,
  formatPrice,
  NEARBY_PLACE_LABELS,
  PROJECT_STATUS_LABELS,
  PUBLICATION_STATUS_META,
} from '../../utils/propertyDisplay';
import { PropertyThumbnail } from '../PropertyThumbnail';

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Paper className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Typography variant="h6" component="h3">
          {title}
        </Typography>
        {action}
      </div>
      {children}
    </Paper>
  );
}

function Specs({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <dl className="grid grid-cols-[minmax(8rem,auto)_1fr] gap-x-4 gap-y-2 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted">{label}</dt>
          <dd className="text-right font-semibold break-words">{value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Opens in a new tab without giving the target page access to this one. */
function ExternalLink({ href, children }: { href: string | null; children: ReactNode }) {
  if (!href) {
    return <>{children}</>;
  }
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1"
    >
      {children}
      <OpenInNew sx={{ fontSize: 14 }} aria-hidden />
    </Link>
  );
}

function area(value: number | null, unit: string): string {
  return value == null ? '—' : `${value.toLocaleString()} ${unit}`;
}

export function OverviewSection({ property }: { property: Property }) {
  const { projectInfo } = property;
  const unit = projectInfo.landAreaUnit ? AREA_UNIT_LABELS[projectInfo.landAreaUnit] : '';
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Section title="Property description">
        {projectInfo.projectDescription ? (
          <Typography variant="body2" className="whitespace-pre-line">
            {projectInfo.projectDescription}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No description yet.
          </Typography>
        )}
        {projectInfo.projectHighlights.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1">
            {projectInfo.projectHighlights.map((highlight) => (
              <li key={highlight} className="flex items-start gap-2 text-sm">
                <CheckCircleOutline fontSize="small" color="success" aria-hidden />
                {highlight}
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Project information">
        <Specs
          rows={[
            ['Construction', PROJECT_STATUS_LABELS[projectInfo.projectStatus]],
            ['Land area', projectInfo.landArea == null ? '—' : `${projectInfo.landArea} ${unit}`],
            ['Towers / blocks', projectInfo.totalTowersBlocks ?? '—'],
            ['Total units', projectInfo.totalUnitsFlats ?? '—'],
            ['Possession from', formatDate(projectInfo.possessionStartDate)],
            ['Possession until', formatDate(projectInfo.possessionEndDate)],
            ['Configurations', property.apartments.length],
            ['Amenities', property.amenities.length],
          ]}
        />
      </Section>
    </div>
  );
}

function MediaTile({ media }: { media: MediaResponse }) {
  const src = sanitizeUrl(media.url);
  if (media.mediaType === 'photo') {
    return (
      <figure className="m-0">
        <PropertyThumbnail
          url={media.url}
          alt={media.title ?? 'Property photo'}
          className="aspect-[4/3] w-full"
        />
        <figcaption className="mt-1 flex items-center justify-between gap-1 text-xs">
          <span className="truncate">{media.title ?? media.originalFilename ?? 'Photo'}</span>
          {media.primary && <span className="font-semibold text-primary-strong">Cover</span>}
        </figcaption>
      </figure>
    );
  }
  if (media.mediaType === 'video' && !media.external && src) {
    return (
      <figure className="m-0">
        <video
          src={src}
          controls
          preload="metadata"
          className="aspect-video w-full rounded-lg bg-black"
        >
          <track kind="captions" />
        </video>
        <figcaption className="mt-1 truncate text-xs">
          {media.title ?? media.originalFilename}
        </figcaption>
      </figure>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <DescriptionOutlined color="action" aria-hidden />
      <div className="min-w-0">
        <ExternalLink href={src}>
          <span className="truncate text-sm font-semibold">
            {media.title ?? media.originalFilename ?? (media.external ? 'External video' : 'File')}
          </span>
        </ExternalLink>
        <Typography variant="caption" color="text.secondary" component="p">
          {media.mediaType === 'brochure' ? 'Brochure' : 'Video'}
          {media.fileSize ? ` · ${formatBytes(media.fileSize)}` : ''}
        </Typography>
      </div>
    </div>
  );
}

export function MediaSection({ property }: { property: Property }) {
  const photos = property.media.filter((m) => m.mediaType === 'photo');
  const others = property.media.filter((m) => m.mediaType !== 'photo');
  const tour = sanitizeUrl(property.threeDTourUrl);
  return (
    <div className="flex flex-col gap-4">
      <Section title={`Photos (${photos.length})`}>
        {photos.length === 0 ? (
          <EmptyState title="No photos" message="At least one photo is required to submit." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((media) => (
              <MediaTile key={media.id} media={media} />
            ))}
          </div>
        )}
      </Section>
      <Section title={`Videos and brochure (${others.length})`}>
        {others.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            None uploaded.
          </Typography>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((media) => (
              <MediaTile key={media.id} media={media} />
            ))}
          </div>
        )}
      </Section>
      <Section title="3D tour">
        {tour ? (
          <ExternalLink href={tour}>
            <span className="inline-flex items-center gap-1">
              <ThreeSixtyOutlined fontSize="small" aria-hidden />
              Open the virtual tour
            </span>
          </ExternalLink>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No 3D tour link.
          </Typography>
        )}
      </Section>
    </div>
  );
}

export function UnitsSection({ property }: { property: Property }) {
  if (property.apartments.length === 0) {
    return (
      <Section title="Unit types and pricing">
        <EmptyState
          title="No unit types"
          message="At least one configuration is required to submit."
        />
      </Section>
    );
  }
  const prices = property.apartments.map((a) => a.startingPrice);
  return (
    <div className="flex flex-col gap-4">
      <Section title={`Unit types and pricing (${property.apartments.length})`}>
        <TableContainer>
          <Table size="small" sx={{ minWidth: 760 }}>
            <caption className="sr-only">Unit types</caption>
            <TableHead>
              <TableRow>
                <TableCell>Unit type</TableCell>
                <TableCell>Configuration</TableCell>
                <TableCell align="right">Area range</TableCell>
                <TableCell align="right">Carpet</TableCell>
                <TableCell align="right">Super built-up</TableCell>
                <TableCell align="right">Starting price</TableCell>
                <TableCell align="right">Parking</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {property.apartments.map((a) => {
                const unit = AREA_UNIT_LABELS[a.areaUnit];
                return (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {a.apartmentName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {APARTMENT_TYPE_LABELS[a.apartmentType]}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {a.bedrooms} bed · {a.bathrooms} bath
                      {a.balconies ? ` · ${a.balconies} balcony` : ''}
                    </TableCell>
                    <TableCell align="right">
                      {a.areaMin != null && a.areaMax != null
                        ? `${a.areaMin.toLocaleString()} – ${a.areaMax.toLocaleString()} ${unit}`
                        : '—'}
                    </TableCell>
                    <TableCell align="right">{area(a.carpetArea, unit)}</TableCell>
                    <TableCell align="right">{area(a.superBuiltUpArea, unit)}</TableCell>
                    <TableCell align="right">{formatPrice(a.startingPrice, a.currency)}</TableCell>
                    <TableCell align="right">{a.carParking}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Section>
      <Section title="Price overview">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            ['Minimum starting price', formatPrice(Math.min(...prices))],
            ['Maximum starting price', formatPrice(Math.max(...prices))],
            [
              'Average starting price',
              formatPrice(prices.reduce((sum, value) => sum + value, 0) / prices.length),
            ],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border p-3">
              <Typography variant="caption" color="text.secondary">
                {label}
              </Typography>
              <Typography variant="h6" component="p">
                {value}
              </Typography>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function groupByCategory(amenities: AmenityResponse[]): Array<[string, AmenityResponse[]]> {
  const groups = new Map<string, AmenityResponse[]>();
  for (const amenity of amenities) {
    const key = amenity.category ?? 'Other';
    groups.set(key, [...(groups.get(key) ?? []), amenity]);
  }
  return [...groups.entries()];
}

export function AmenitiesLocationSection({ property }: { property: Property }) {
  const { location } = property;
  const hasCoordinates = location.latitude != null && location.longitude != null;
  const mapUrl = hasCoordinates
    ? sanitizeUrl(
        `https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=16/${location.latitude}/${location.longitude}`,
      )
    : null;
  return (
    <div className="flex flex-col gap-4">
      <Section title={`Amenities (${property.amenities.length})`}>
        {property.amenities.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No amenities selected.
          </Typography>
        ) : (
          <div className="flex flex-col gap-4">
            {groupByCategory(property.amenities).map(([category, items]) => (
              <div key={category}>
                <Typography variant="subtitle2" className="mb-2 capitalize">
                  {category}
                </Typography>
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {items.map((amenity) => (
                    <li
                      key={amenity.id}
                      className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                    >
                      <CheckCircleOutline fontSize="small" color="success" aria-hidden />
                      {amenity.name}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Section>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Section title="Location details">
          <Specs
            rows={[
              ['Address', location.projectAddress ?? '—'],
              ['Locality', location.locality ?? '—'],
              ['City', location.city ?? '—'],
              ['State', location.state ?? '—'],
              ['PIN code', location.pincode ?? '—'],
              ['Landmark', location.landmark ?? '—'],
              [
                'Coordinates',
                hasCoordinates ? (
                  <ExternalLink href={mapUrl}>
                    <span className="inline-flex items-center gap-1">
                      <MapOutlined sx={{ fontSize: 16 }} aria-hidden />
                      {location.latitude}, {location.longitude}
                    </span>
                  </ExternalLink>
                ) : (
                  '—'
                ),
              ],
            ]}
          />
        </Section>
        <Section title={`Nearby places (${property.nearbyPlaces.length})`}>
          {property.nearbyPlaces.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              None added.
            </Typography>
          ) : (
            <ul className="flex flex-col divide-y">
              {property.nearbyPlaces.map((place) => (
                <li key={place.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="flex items-start gap-2">
                    <PlaceOutlined fontSize="small" color="action" aria-hidden />
                    <span>
                      <Typography variant="body2" fontWeight={600}>
                        {place.placeName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {NEARBY_PLACE_LABELS[place.placeType]}
                      </Typography>
                    </span>
                  </span>
                  <Typography variant="body2" title="Entered manually, not verified">
                    {place.distanceKm} km
                  </Typography>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}

export function BuilderSection({ property }: { property: Property }) {
  const { details, owner } = property;
  const email = sanitizeUrl(`mailto:${details.projectEmail}`);
  const phone = sanitizeUrl(`tel:${details.projectPhone}`);
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Section title="Builder information">
        <Specs
          rows={[
            ['Builder / company', details.builderCompanyName],
            ['RERA number', details.reraNumber ?? '—'],
            ['GST number', details.gstNumber ?? '—'],
            [
              'Project email',
              email ? <Link href={email}>{details.projectEmail}</Link> : details.projectEmail,
            ],
            [
              'Project phone',
              phone ? <Link href={phone}>{details.projectPhone}</Link> : details.projectPhone,
            ],
          ]}
        />
      </Section>
      <Section title="Listing owner">
        {owner ? (
          <Specs
            rows={[
              ['Name', owner.fullName ?? '—'],
              ['Email', owner.email ?? '—'],
              ['Phone', owner.phone ?? '—'],
              ['User ID', owner.id],
            ]}
          />
        ) : (
          <Typography variant="body2" color="text.secondary">
            Owner details are not available.
          </Typography>
        )}
      </Section>
    </div>
  );
}

const ACTIVITY_LABELS: Record<string, string> = {
  created: 'Created',
  submitted: 'Submitted for review',
  approved: 'Approved',
  rejected: 'Rejected',
  published: 'Published',
  unpublished: 'Unpublished',
  suspended: 'Suspended',
  resumed: 'Resumed',
  archived: 'Archived',
  reverted_to_draft: 'Returned to draft after an owner edit',
  deleted: 'Deleted',
  restored: 'Restored',
  legal_status_changed: 'Legal status changed',
};

function statusLabel(value: string | null): string {
  if (!value) return '—';
  return value in PUBLICATION_STATUS_META
    ? PUBLICATION_STATUS_META[value as keyof typeof PUBLICATION_STATUS_META].label
    : value.replace(/_/g, ' ');
}

export function ActivitySection({ property }: { property: Property }) {
  const history = [...property.statusHistory].reverse();
  return (
    <Section title="Activity log">
      {history.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No activity yet.
        </Typography>
      ) : (
        <ol className="relative flex flex-col gap-4 border-l pl-5">
          {history.map((change, index) => (
            <li key={`${change.createdAt}-${index}`} className="relative">
              <span
                aria-hidden
                className="absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full bg-primary-500"
              />
              <Typography variant="body2" fontWeight={600}>
                {ACTIVITY_LABELS[change.action] ?? change.action}
              </Typography>
              <Typography variant="caption" color="text.secondary" component="p">
                {formatDateTime(change.createdAt)}
                {change.fromStatus !== change.toStatus &&
                  ` · ${statusLabel(change.fromStatus)} → ${statusLabel(change.toStatus)}`}
                {change.actorUserId != null && ` · by user ${change.actorUserId}`}
              </Typography>
              {change.reason && (
                <Typography
                  variant="body2"
                  className="mt-1 rounded-md bg-[var(--mui-palette-action-hover)] px-3 py-2"
                >
                  {change.reason}
                </Typography>
              )}
            </li>
          ))}
        </ol>
      )}
      <Typography variant="caption" color="text.secondary" component="p" className="mt-4">
        Created {formatDateTime(property.createdAt)} · Updated {formatDateTime(property.updatedAt)}{' '}
        · {formatPlace([property.slug])}
      </Typography>
    </Section>
  );
}
