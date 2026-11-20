import NavigateNext from '@mui/icons-material/NavigateNext';
import Alert from '@mui/material/Alert';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom';

import { ErrorState } from '@/components/common/Feedback/ErrorState';
import { ROUTES } from '@/utils/constants';

import { BannerEditor } from '../components/BannerEditor';
import { useBanner, useBannerImageFile } from '../hooks/useBanners';
import type { Banner } from '../types/banner.types';

function parseId(value: string | null | undefined): number | null {
  if (!value || !/^\d{1,18}$/.test(value)) return null;
  const id = Number(value);
  return id > 0 ? id : null;
}

interface HeadingProps {
  title: string;
  crumb: string;
}

function Heading({ title, crumb }: HeadingProps) {
  return (
    <>
      <Typography variant="h1">{title}</Typography>
      <Breadcrumbs
        aria-label="Breadcrumb"
        separator={<NavigateNext fontSize="small" />}
        className="mt-1"
      >
        <Link component={RouterLink} to={ROUTES.dashboard} underline="hover">
          Dashboard
        </Link>
        <Link component={RouterLink} to={ROUTES.banners} underline="hover">
          Banners
        </Link>
        <Typography color="text.secondary" aria-current="page">
          {crumb}
        </Typography>
      </Breadcrumbs>
    </>
  );
}

function LoadingEditor({ heading }: { heading: HeadingProps }) {
  return (
    <div className="flex flex-col gap-6" aria-busy aria-label="Loading banner">
      <Heading {...heading} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Paper className="flex flex-col gap-4 p-5">
          {[0, 1, 2, 3, 4].map((key) => (
            <Skeleton key={key} variant="rounded" height={48} />
          ))}
        </Paper>
        <Paper className="p-5">
          <Skeleton variant="rounded" className="aspect-[16/5] h-auto" />
        </Paper>
      </div>
    </div>
  );
}

function LoadFailed({
  heading,
  error,
  onRetry,
}: {
  heading: HeadingProps;
  error: Error & { status?: number | null };
  onRetry: () => void;
}) {
  const missing = error.status === 404;
  return (
    <div className="flex flex-col gap-6">
      <Heading {...heading} />
      <Paper>
        <ErrorState
          message={missing ? 'This banner does not exist or was deleted.' : error.message}
          onRetry={missing ? undefined : onRetry}
        />
        <div className="flex justify-center pb-6">
          <Link component={RouterLink} to={ROUTES.banners}>
            Back to banners
          </Link>
        </div>
      </Paper>
    </div>
  );
}

function EditBanner({ id }: { id: number }) {
  const heading = { title: 'Edit banner', crumb: 'Edit' };
  const { data: banner, error, refetch } = useBanner(id);
  if (banner) {
    // Refetches after a save keep the form (and a pending image retry); diffs use the fresh banner.
    return (
      <BannerEditor
        key={banner.id}
        mode={{ kind: 'edit', banner }}
        heading={<Heading {...heading} />}
      />
    );
  }
  if (error) return <LoadFailed heading={heading} error={error} onRetry={() => void refetch()} />;
  return <LoadingEditor heading={heading} />;
}

function DuplicateBanner({ source }: { source: Banner }) {
  const heading = { title: 'Duplicate banner', crumb: 'Duplicate' };
  const image = useBannerImageFile(source);
  if (image.isPending) return <LoadingEditor heading={heading} />;
  return (
    <BannerEditor
      mode={{ kind: 'duplicate', source, image: image.data ?? null }}
      heading={<Heading {...heading} />}
      notice={
        <Alert severity={image.data ? 'info' : 'warning'}>
          {image.data
            ? `Copied from "${source.title}". The copy is saved as a new, inactive banner with its own copy of the image; review it before activating.`
            : `The image of "${source.title}" could not be copied. Upload an image to save the copy.`}
        </Alert>
      }
    />
  );
}

function DuplicateLoader({ id }: { id: number }) {
  const heading = { title: 'Duplicate banner', crumb: 'Duplicate' };
  const { data: source, error, refetch } = useBanner(id);
  if (source) return <DuplicateBanner source={source} />;
  if (error) return <LoadFailed heading={heading} error={error} onRetry={() => void refetch()} />;
  return <LoadingEditor heading={heading} />;
}

/** `/banners/new` (optionally `?from={id}` to duplicate) and `/banners/:id/edit`. */
export function BannerFormPage() {
  const params = useParams();
  const [search] = useSearchParams();

  if (params.id !== undefined) {
    const id = parseId(params.id);
    if (id === null) {
      return (
        <LoadFailed
          heading={{ title: 'Edit banner', crumb: 'Edit' }}
          error={Object.assign(new Error('Invalid banner id.'), { status: 404 })}
          onRetry={() => undefined}
        />
      );
    }
    return <EditBanner id={id} />;
  }

  const fromId = parseId(search.get('from'));
  if (fromId !== null) return <DuplicateLoader id={fromId} />;

  return (
    <BannerEditor
      mode={{ kind: 'create' }}
      heading={<Heading title="Add new banner" crumb="Add new" />}
    />
  );
}
