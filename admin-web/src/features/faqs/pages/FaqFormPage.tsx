import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import { Link as RouterLink, useParams } from 'react-router-dom';

import { ErrorState } from '@/components/common/Feedback/ErrorState';
import { type Crumb, PageHeading } from '@/components/common/PageHeading';
import { ROUTES } from '@/utils/constants';

import { FaqEditor } from '../components/FaqEditor';
import { useFaq, useNextFaqSortOrder } from '../hooks/useFaqs';
import { parseFaqId } from '../utils/faqForm';

const listCrumbs: Crumb[] = [
  { label: 'Dashboard', to: ROUTES.dashboard },
  { label: 'FAQs', to: ROUTES.faqs },
];

const editHeading = { title: 'Edit FAQ', crumbs: [...listCrumbs, { label: 'Edit' }] };

interface HeadingProps {
  title: string;
  crumbs: readonly Crumb[];
}

function LoadingEditor({ heading }: { heading: HeadingProps }) {
  return (
    <div className="flex flex-col gap-6" aria-busy aria-label="Loading FAQ">
      <PageHeading {...heading} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,1fr)]">
        <Paper className="flex flex-col gap-4 p-5">
          <Skeleton variant="rounded" height={72} />
          <Skeleton variant="rounded" height={220} />
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
          <Link component={RouterLink} to={ROUTES.faqs}>
            Back to FAQs
          </Link>
        </div>
      </Paper>
    </div>
  );
}

function EditFaq({ id }: { id: number }) {
  const { data: faq, error, refetch } = useFaq(id);
  if (faq) {
    return (
      <FaqEditor
        key={faq.id}
        mode={{ kind: 'edit', faq }}
        heading={<PageHeading {...editHeading} />}
      />
    );
  }
  if (error) {
    const missing = 'status' in error && error.status === 404;
    return (
      <LoadFailed
        heading={editHeading}
        message={missing ? 'This FAQ does not exist or was deleted.' : error.message}
        onRetry={missing ? undefined : () => void refetch()}
      />
    );
  }
  return <LoadingEditor heading={editHeading} />;
}

function CreateFaq() {
  const heading = { title: 'Add new FAQ', crumbs: [...listCrumbs, { label: 'Add new' }] };
  // Only a suggestion: when it cannot be loaded the form starts at the backend default (0).
  const next = useNextFaqSortOrder();
  if (next.isPending) return <LoadingEditor heading={heading} />;
  return (
    <FaqEditor
      mode={{ kind: 'create', sortOrder: next.data ?? 0 }}
      heading={<PageHeading {...heading} />}
    />
  );
}

/** `/faqs/new` and `/faqs/:id/edit`. */
export function FaqFormPage() {
  const params = useParams();
  if (params.id === undefined) return <CreateFaq />;
  const id = parseFaqId(params.id);
  if (id === null) return <LoadFailed heading={editHeading} message="Invalid FAQ id." />;
  return <EditFaq id={id} />;
}
