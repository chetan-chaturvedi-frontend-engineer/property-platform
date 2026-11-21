import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { ErrorState } from '@/components/common/Feedback/ErrorState';
import { RichTextContent } from '@/components/common/RichText';
import { formatDateTime } from '@/utils/formatters';

import type { Faq, FaqCategory } from '../types/faq.types';
import { categoryTone, FAQ_RICH_TEXT_FEATURES } from '../utils/faqDisplay';

import { FaqCategoryChip } from './FaqCategoryChip';
import { FaqStatusChip } from './FaqStatusChip';

interface FaqDetailsContentProps {
  faq: Faq | undefined;
  /** Configured categories, for the badge color. */
  categories: readonly FaqCategory[];
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  /** `panel`: under a table row (question already visible above). `full`: question as a heading. */
  variant?: 'panel' | 'full';
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
      <dd className="m-0 text-sm">{children}</dd>
    </div>
  );
}

/** A FAQ's full question, answer and facts; read-only. Handles its own loading and error states. */
export function FaqDetailsContent({
  faq,
  categories,
  isLoading = false,
  error = null,
  onRetry,
  variant = 'full',
}: FaqDetailsContentProps) {
  if (error && !faq) {
    const missing = 'status' in error && error.status === 404;
    return (
      <ErrorState
        title="Could not load the FAQ"
        message={missing ? 'This FAQ does not exist or was deleted.' : error.message}
        onRetry={missing ? undefined : onRetry}
      />
    );
  }
  if (isLoading || !faq) {
    return (
      <div className="flex flex-col gap-3 py-2" aria-busy aria-label="Loading FAQ">
        <Skeleton variant="text" width="70%" />
        <Skeleton variant="rounded" height={72} />
        <Skeleton variant="text" width="40%" />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          Question
        </Typography>
        <Typography
          variant={variant === 'full' ? 'h6' : 'body2'}
          component="p"
          fontWeight={600}
          className="break-words"
        >
          {faq.question}
        </Typography>
      </div>
      <div className="flex flex-col gap-1">
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          Answer
        </Typography>
        <div className="rounded-lg border bg-[var(--mui-palette-background-default)] px-4 py-3">
          <RichTextContent html={faq.answer} label="FAQ answer" features={FAQ_RICH_TEXT_FEATURES} />
        </div>
      </div>
      <dl className="m-0 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Fact label="Category">
          <FaqCategoryChip
            label={faq.categoryLabel}
            tone={categoryTone(faq.category, categories)}
          />
        </Fact>
        <Fact label="Status">
          <FaqStatusChip status={faq.status} />
        </Fact>
        <Fact label="Display order">
          <span className="tabular-nums">{faq.sortOrder}</span>
        </Fact>
        <Fact label="Created">{formatDateTime(faq.createdAt)}</Fact>
        <Fact label="Last updated">{formatDateTime(faq.updatedAt)}</Fact>
      </dl>
    </div>
  );
}
