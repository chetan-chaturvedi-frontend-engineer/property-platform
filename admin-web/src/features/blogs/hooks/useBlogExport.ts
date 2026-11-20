import { useCallback, useEffect, useRef, useState } from 'react';

import { toApiError } from '@/services/api/apiError';
import { notify } from '@/store/notificationStore';
import { downloadCsv } from '@/utils/csv';

import { blogService } from '../services/blogService';
import type { BlogFilters, BlogSummary } from '../types/blog.types';
import { toBlogCsv } from '../utils/blogCsv';

/** Rows per export; there is no export endpoint, so rows are read page by page (100 each). */
export const BLOG_EXPORT_LIMIT = 2000;

const fileName = () => `blogs-${new Date().toISOString().slice(0, 10)}.csv`;
const plural = (count: number) => `${count} blog${count === 1 ? '' : 's'}`;

/** Exports the selected blogs, or every blog matching the filters, as CSV; aborted on unmount. */
export function useBlogExport() {
  const [isExporting, setIsExporting] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  const exportRows = useCallback((rows: readonly BlogSummary[]) => {
    downloadCsv(toBlogCsv(rows), fileName());
    notify(`Exported ${plural(rows.length)}.`, 'success');
  }, []);

  const exportMatching = useCallback(async (filters: Omit<BlogFilters, 'page' | 'size'>) => {
    if (controller.current) return;
    const current = new AbortController();
    controller.current = current;
    setIsExporting(true);
    try {
      const { rows, total } = await blogService.listAll(filters, {
        limit: BLOG_EXPORT_LIMIT,
        signal: current.signal,
      });
      if (rows.length === 0) {
        notify('No blogs match these filters.', 'info');
        return;
      }
      downloadCsv(toBlogCsv(rows), fileName());
      notify(
        total > rows.length
          ? `Exported the first ${rows.length} of ${total} blogs. Narrow the filters to export the rest.`
          : `Exported ${plural(rows.length)}.`,
        total > rows.length ? 'warning' : 'success',
      );
    } catch (error) {
      if (!current.signal.aborted) notify(`Export failed: ${toApiError(error).message}`, 'error');
    } finally {
      controller.current = null;
      setIsExporting(false);
    }
  }, []);

  return { exportRows, exportMatching, isExporting };
}
