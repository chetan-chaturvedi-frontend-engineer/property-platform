import Close from '@mui/icons-material/Close';
import EditOutlined from '@mui/icons-material/EditOutlined';
import OpenInNew from '@mui/icons-material/OpenInNew';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Skeleton from '@mui/material/Skeleton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { ImageThumbnail } from '@/components/common/ImageThumbnail';
import { Button } from '@/components/common/Button';
import { ErrorState } from '@/components/common/Feedback/ErrorState';
import type { EntityId } from '@/types/common.types';
import { formatDateTime } from '@/utils/formatters';

import { useBanner, useBannerActivity } from '../hooks/useBanners';
import type { Banner } from '../types/banner.types';
import { DISPLAY_STATE_META, safeExternalHref } from '../utils/bannerDisplay';
import { bannerPlacementLabel, bannerTypeLabel } from '../utils/bannerOptions';
import { LINK_TYPE_LABELS } from '../utils/bannerFilters';

import { BannerActivity } from './BannerActivity';
import { BannerStatusChip } from './BannerStatusChip';

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
      <dd className="mt-0.5 text-sm break-words">{children ?? '—'}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <Typography variant="subtitle2" component="h3" fontWeight={700}>
        {title}
      </Typography>
      {children}
    </section>
  );
}

function LinkValue({ banner }: { banner: Banner }) {
  if (!banner.linkType || !banner.link) return <>No link</>;
  const href = safeExternalHref(banner);
  if (href) {
    return (
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1"
      >
        {banner.link}
        <OpenInNew fontSize="inherit" aria-label="(opens in a new tab)" />
      </Link>
    );
  }
  return <code>{banner.link}</code>;
}

function BannerDetails({ banner }: { banner: Banner }) {
  return (
    <div className="flex flex-col gap-5">
      <ImageThumbnail src={banner.imageUrl} alt={banner.title} className="w-full" eager />
      <Section title="Banner">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <Field label="Status">
            <div className="flex flex-col items-start gap-1">
              <BannerStatusChip state={banner.displayState} />
              <Typography variant="caption" color="text.secondary">
                {DISPLAY_STATE_META[banner.displayState].description}
              </Typography>
            </div>
          </Field>
          <Field label="Switch">{banner.status === 'active' ? 'Active' : 'Inactive'}</Field>
          <Field label="Banner type">{bannerTypeLabel(banner.type)}</Field>
          <Field label="Placement">{bannerPlacementLabel(banner.placement)}</Field>
          <Field label="Link type">
            {banner.linkType ? LINK_TYPE_LABELS[banner.linkType] : 'No link'}
          </Field>
          <Field label={banner.linkType === 'external' ? 'External URL' : 'Page'}>
            <LinkValue banner={banner} />
          </Field>
        </dl>
      </Section>
      <Divider />
      <Section title="Schedule">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <Field label="Start">
            {banner.startDate ? formatDateTime(banner.startDate) : 'Immediately (no start date)'}
          </Field>
          <Field label="End">
            {banner.endDate ? formatDateTime(banner.endDate) : 'Never (no end date)'}
          </Field>
        </dl>
      </Section>
      <Divider />
      <Section title="Record">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <Field label="Banner ID">#{banner.id}</Field>
          <Field label="Created">{formatDateTime(banner.createdAt)}</Field>
          <Field label="Last updated">{formatDateTime(banner.updatedAt)}</Field>
        </dl>
      </Section>
    </div>
  );
}

function ActivitySection({ bannerId }: { bannerId: EntityId }) {
  const { data, isPending, error, refetch } = useBannerActivity(bannerId);
  return (
    <Section title="Activity">
      <BannerActivity
        entries={data}
        isLoading={isPending}
        error={error}
        onRetry={() => void refetch()}
      />
    </Section>
  );
}

interface BannerDetailsDrawerProps {
  bannerId: EntityId;
  onClose: () => void;
  /** Shows an Edit button. */
  onEdit?: (banner: Banner) => void;
  /** Shows the audit trail (needs the system log permission). */
  showActivity?: boolean;
}

/** Every detail of one banner, freshly loaded, in a side drawer. */
export function BannerDetailsDrawer({
  bannerId,
  onClose,
  onEdit,
  showActivity = false,
}: BannerDetailsDrawerProps) {
  const { data: banner, isPending, error, refetch } = useBanner(bannerId);

  return (
    <Drawer anchor="right" open onClose={onClose}>
      <div className="flex w-[min(36rem,100vw)] flex-col gap-4 p-5">
        <header className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <Typography variant="h6" component="h2">
              {banner ? banner.title : 'Banner details'}
            </Typography>
            {banner && (
              <Typography variant="body2" color="text.secondary" noWrap>
                {bannerTypeLabel(banner.type)} · {bannerPlacementLabel(banner.placement)}
              </Typography>
            )}
          </div>
          <Tooltip title="Close">
            <IconButton aria-label="Close details" onClick={onClose}>
              <Close />
            </IconButton>
          </Tooltip>
        </header>
        {banner ? (
          <>
            <BannerDetails banner={banner} />
            {onEdit && (
              <div>
                <Button startIcon={<EditOutlined />} onClick={() => onEdit(banner)}>
                  Edit banner
                </Button>
              </div>
            )}
            {showActivity && (
              <>
                <Divider />
                <ActivitySection bannerId={banner.id} />
              </>
            )}
          </>
        ) : isPending ? (
          <div className="flex flex-col gap-3" aria-busy aria-label="Loading banner">
            <Skeleton variant="rounded" height={140} />
            <Skeleton variant="rounded" height={120} />
            <Skeleton variant="rounded" height={88} />
          </div>
        ) : (
          <ErrorState
            message={
              error?.status === 404
                ? 'This banner does not exist or was deleted.'
                : (error?.message ?? 'Could not load the banner.')
            }
            onRetry={error?.status === 404 ? undefined : () => void refetch()}
          />
        )}
      </div>
    </Drawer>
  );
}
