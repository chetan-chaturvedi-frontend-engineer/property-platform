import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom';

import { ErrorState } from '@/components/common/Feedback/ErrorState';
import { blogRoutes, ROUTES } from '@/utils/constants';

import { BlogEditor } from '../components/BlogEditor';
import { BlogPageHeading, type Crumb } from '../components/BlogPageHeading';
import { useBlog, useBlogImageFile } from '../hooks/useBlogs';
import type { Blog } from '../types/blog.types';
import { parseBlogId } from '../utils/blogForm';

interface HeadingProps {
  title: string;
  crumbs: readonly Crumb[];
}

const listCrumbs: Crumb[] = [
  { label: 'Dashboard', to: ROUTES.dashboard },
  { label: 'Blogs', to: ROUTES.blogs },
];

function LoadingEditor({ heading }: { heading: HeadingProps }) {
  return (
    <div className="flex flex-col gap-6" aria-busy aria-label="Loading blog">
      <BlogPageHeading {...heading} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,1fr)]">
        <Paper className="flex flex-col gap-4 p-5">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} variant="rounded" height={48} />
          ))}
          <Skeleton variant="rounded" height={280} />
        </Paper>
        <Paper className="p-5">
          <Skeleton variant="rounded" className="aspect-[40/21] h-auto" />
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
  onRetry?: () => void;
}) {
  const missing = error.status === 404;
  return (
    <div className="flex flex-col gap-6">
      <BlogPageHeading {...heading} />
      <Paper>
        <ErrorState
          message={missing ? 'This blog does not exist or was deleted.' : error.message}
          onRetry={missing ? undefined : onRetry}
        />
        <div className="flex justify-center pb-6">
          <Link component={RouterLink} to={ROUTES.blogs}>
            Back to blogs
          </Link>
        </div>
      </Paper>
    </div>
  );
}

function EditBlog({ id }: { id: number }) {
  const { data: blog, error, refetch } = useBlog(id);
  const heading = {
    title: 'Edit blog',
    crumbs: [
      ...listCrumbs,
      ...(blog ? [{ label: blog.title, to: blogRoutes.detail(id) }] : []),
      { label: 'Edit' },
    ],
  };
  if (blog) {
    return (
      <BlogEditor
        key={blog.id}
        mode={{ kind: 'edit', blog }}
        heading={<BlogPageHeading {...heading} />}
      />
    );
  }
  if (error) return <LoadFailed heading={heading} error={error} onRetry={() => void refetch()} />;
  return <LoadingEditor heading={heading} />;
}

function DuplicateBlog({ source }: { source: Blog }) {
  const heading = { title: 'Duplicate blog', crumbs: [...listCrumbs, { label: 'Duplicate' }] };
  const image = useBlogImageFile(source);
  if (image.isPending) return <LoadingEditor heading={heading} />;
  const imageMissing = source.featureImageUrl !== null && !image.data;
  return (
    <BlogEditor
      mode={{ kind: 'duplicate', source, image: image.data ?? null }}
      heading={<BlogPageHeading {...heading} />}
      notice={
        <Alert severity={imageMissing ? 'warning' : 'info'}>
          {imageMissing
            ? `The featured image of "${source.title}" could not be copied. Upload one if needed.`
            : `Copied from "${source.title}". The copy is saved as a new draft with its own URL; review it before publishing.`}
        </Alert>
      }
    />
  );
}

function DuplicateLoader({ id }: { id: number }) {
  const heading = { title: 'Duplicate blog', crumbs: [...listCrumbs, { label: 'Duplicate' }] };
  const { data: source, error, refetch } = useBlog(id);
  if (source) return <DuplicateBlog source={source} />;
  if (error) return <LoadFailed heading={heading} error={error} onRetry={() => void refetch()} />;
  return <LoadingEditor heading={heading} />;
}

/** `/blogs/new` (optionally `?from={id}` to duplicate) and `/blogs/:id/edit`. */
export function BlogFormPage() {
  const params = useParams();
  const [search] = useSearchParams();

  if (params.id !== undefined) {
    const id = parseBlogId(params.id);
    if (id === null) {
      return (
        <LoadFailed
          heading={{ title: 'Edit blog', crumbs: [...listCrumbs, { label: 'Edit' }] }}
          error={Object.assign(new Error('Invalid blog id.'), { status: 404 })}
        />
      );
    }
    return <EditBlog id={id} />;
  }

  const fromId = parseBlogId(search.get('from'));
  if (fromId !== null) return <DuplicateLoader id={fromId} />;

  return (
    <BlogEditor
      mode={{ kind: 'create' }}
      heading={
        <BlogPageHeading title="Add new blog" crumbs={[...listCrumbs, { label: 'Add new' }]} />
      }
    />
  );
}
