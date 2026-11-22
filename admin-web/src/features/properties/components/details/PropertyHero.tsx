import PhotoLibraryOutlined from '@mui/icons-material/PhotoLibraryOutlined';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import type { Property } from '../../types/property.types';
import {
  coverOf,
  formatDate,
  formatPlace,
  priceRange,
  PROJECT_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
} from '../../utils/propertyDisplay';
import { PropertyThumbnail } from '../PropertyThumbnail';
import { LegalStatusChip, PublicationStatusChip } from '../PropertyStatusChips';

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-2">
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} className="break-words">
        {children}
      </Typography>
    </div>
  );
}

export function PropertyHero({ property }: { property: Property }) {
  const cover = coverOf(property);
  const photoCount = property.media.filter((m) => m.mediaType === 'photo').length;
  const videoCount = property.media.filter((m) => m.mediaType === 'video').length;
  const { details, location, projectInfo } = property;

  return (
    <Paper className="flex flex-col gap-5 p-4 md:flex-row">
      <div className="relative shrink-0 md:w-72">
        <PropertyThumbnail
          url={cover?.url}
          alt={cover?.title ?? details.projectName}
          eager
          className="aspect-[4/3] w-full"
        />
        {(photoCount > 0 || videoCount > 0) && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-black/65 px-2 py-1 text-xs font-semibold text-white">
            <PhotoLibraryOutlined sx={{ fontSize: 16 }} aria-hidden />
            {photoCount} photos{videoCount ? `, ${videoCount} videos` : ''}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <PublicationStatusChip status={property.publicationStatus} />
          <LegalStatusChip status={projectInfo.legalApprovalStatus} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Typography variant="h2" component="h2">
            {details.projectName}
          </Typography>
          <span className="rounded bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-800 dark:bg-primary-500/15 dark:text-primary-300">
            {PROPERTY_TYPE_LABELS[details.propertyType]}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-2.5 lg:grid-cols-2">
          <Fact label="Builder">{details.builder?.fullName ?? details.builderCompanyName}</Fact>
          <Fact label="RERA number">{details.reraNumber ?? '—'}</Fact>
          <Fact label="Location">
            {formatPlace([location.locality, location.city, location.state])}
          </Fact>
          <Fact label="Total units">{projectInfo.totalUnitsFlats ?? '—'}</Fact>
          <Fact label="Owner">{property.owner?.fullName ?? property.owner?.email ?? '—'}</Fact>
          <Fact label="Price range">{priceRange(property)}</Fact>
          <Fact label="Created on">{formatDate(property.createdAt)}</Fact>
          <Fact label="Construction">{PROJECT_STATUS_LABELS[projectInfo.projectStatus]}</Fact>
        </div>
      </div>
    </Paper>
  );
}
