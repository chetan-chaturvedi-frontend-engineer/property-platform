import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { ErrorState } from '@/components/common/Feedback/ErrorState';
import { formatDateTime } from '@/utils/formatters';

import type { ContentPage } from '../types/contentPage.types';
import { contentPagePath, splitKeywords } from '../utils/contentPageDisplay';

import { ContentPageArticle } from './ContentPageArticle';
import { ContentPageStatusChip } from './ContentPageStatusChip';
import { ContentPageTypeChip } from './ContentPageTypeChip';

interface ContentPageDetailsContentProps {
  page: ContentPage | undefined;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

interface FactProps {
  label: string;
  children: ReactNode;
}

function Fact({ label, children }: FactProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          {label}
        </Typography>
      </dt>
      <dd className="m-0 text-sm break-words">{children}</dd>
    </div>
  );
}

const notSet = (
  <Typography variant="body2" component="span" color="text.secondary">
    Not set
  </Typography>
);

/** A page's facts, SEO fields and rendered content; read-only. Handles loading and error states. */
export function ContentPageDetailsContent({
  page,
  isLoading = false,
  error = null,
  onRetry,
}: ContentPageDetailsContentProps) {
  if (error && !page) {
    const missing = 'status' in error && error.status === 404;
    return (
      <ErrorState
        title="Could not load the page"
        message={missing ? 'This page does not exist or was deleted.' : error.message}
        onRetry={missing ? undefined : onRetry}
      />
    );
  }
  if (isLoading || !page) {
    return (
      <div className="flex flex-col gap-3 py-2" aria-busy aria-label="Loading page">
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="rounded" height={64} />
        <Skeleton variant="rounded" height={160} />
      </div>
    );
  }

  const keywords = splitKeywords(page.metaKeywords);
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <dl className="m-0 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Fact label="URL">
          <span className="font-mono text-xs">{contentPagePath(page.slug)}</span>
        </Fact>
        <Fact label="Type">
          <ContentPageTypeChip type={page.type} />
        </Fact>
        <Fact label="Status">
          <ContentPageStatusChip status={page.status} />
        </Fact>
        <Fact label="Created">{formatDateTime(page.createdAt)}</Fact>
        <Fact label="Last updated">{formatDateTime(page.updatedAt)}</Fact>
      </dl>

      <section aria-label="SEO" className="flex flex-col gap-3 rounded-lg border p-4">
        <Typography variant="subtitle2" component="h3" fontWeight={700}>
          SEO
        </Typography>
        <dl className="m-0 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Fact label="Meta title">{page.metaTitle ?? notSet}</Fact>
          <Fact label="Meta description">{page.metaDescription ?? notSet}</Fact>
          <Fact label="Meta keywords">
            {keywords.length > 0 ? (
              <span className="flex flex-wrap gap-1">
                {keywords.map((keyword) => (
                  <Chip key={keyword} size="small" label={keyword} />
                ))}
              </span>
            ) : (
              notSet
            )}
          </Fact>
        </dl>
      </section>

      <section aria-label="Content preview" className="rounded-lg border px-4 py-4 sm:px-6">
        <ContentPageArticle
          heading={page.heading}
          subHeading={page.subHeading}
          content={page.content}
        />
      </section>
    </div>
  );
}
