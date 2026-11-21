import { useFaq } from '../hooks/useFaqs';
import type { FaqCategory } from '../types/faq.types';

import { FaqDetailsContent } from './FaqDetailsContent';

interface FaqExpandedRowProps {
  id: number;
  categories: readonly FaqCategory[];
}

/** The details panel under an expanded table row; the list has no answer, so it loads the FAQ. */
export function FaqExpandedRow({ id, categories }: FaqExpandedRowProps) {
  const { data, isPending, error, refetch } = useFaq(id);
  return (
    <div className="px-2 pt-1 sm:pl-24">
      <FaqDetailsContent
        variant="panel"
        faq={data}
        categories={categories}
        isLoading={isPending}
        error={error}
        onRetry={() => void refetch()}
      />
    </div>
  );
}
