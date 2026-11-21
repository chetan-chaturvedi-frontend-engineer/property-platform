import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import { Link as RouterLink, useParams } from 'react-router-dom';

import { ErrorState } from '@/components/common/Feedback/ErrorState';
import { type Crumb, PageHeading } from '@/components/common/PageHeading';
import { ROUTES } from '@/utils/constants';

import { ContentPageEditor } from '../components/ContentPageEditor';
import { useContentPage } from '../hooks/useContentPages';
import { parseContentPageId } from '../utils/contentPageForm';

const listCrumbs: Crumb[] = [
  { label: 'Dashboard', to: ROUTES.dashboard },
  { label: 'Pages', to: ROUTES.pages },
];

const editHeading = { title: 'Edit page', crumbs: [...listCrumbs, { label: 'Edit' }] };
const createHeading = { title: 'Add new page', crumbs: [...listCrumbs, { label: 'Add new' }] };

interface HeadingProps {
  title: string;
  crumbs: readonly Crumb[];
}

function LoadingEditor({ heading }: { heading: HeadingProps }) {
  return (
    <div className="flex flex-col gap-6" aria-busy aria-label="Loading page">
      <PageHeading {...heading} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,1fr)]">
        <Paper className="flex flex-col gap-4 p-5">
          <Skeleton variant="rounded" height={56} />
          <Skeleton variant="rounded" height={56} />
          <Skeleton variant="rounded" height={280} />
        </Paper>
        <Paper className="flex flex-col gap-4 p-5">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} variant="rounded" height={48} />
          ))}
        </Paper>
      </div>
    </div>
  );
}

interface LoadFailedProps {
  heading: HeadingProps;
  message: string;
  onRetry?: () => void;
}

function LoadFailed({ heading, message, onRetry }: LoadFailedProps) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeading {...heading} />
      <Paper>
        <ErrorState message={message} onRetry={onRetry} />
        <div className="flex justify-center pb-6">
          <Link component={RouterLink} to={ROUTES.pages}>
            Back to pages
          </Link>
        </div>
      </Paper>
    </div>
  );
}

function EditContentPage({ id }: { id: number }) {
  const { data: page, error, refetch } = useContentPage(id);
  if (page) {
    return (
      <ContentPageEditor
        key={page.id}
        mode={{ kind: 'edit', page }}
        heading={<PageHeading {...editHeading} />}
      />
    );
  }
  if (error) {
    const missing = 'status' in error && error.status === 404;
    return (
      <LoadFailed
        heading={editHeading}
        message={missing ? 'This page does not exist or was deleted.' : error.message}
        onRetry={missing ? undefined : () => void refetch()}
      />
    );
  }
  return <LoadingEditor heading={editHeading} />;
}

/** `/pages/new` and `/pages/:id/edit`. */
export function ContentPageFormPage() {
  const params = useParams();
  if (params.id === undefined) {
    return (
      <ContentPageEditor mode={{ kind: 'create' }} heading={<PageHeading {...createHeading} />} />
    );
  }
  const id = parseContentPageId(params.id);
  if (id === null) return <LoadFailed heading={editHeading} message="Invalid page id." />;
  return <EditContentPage id={id} />;
}
