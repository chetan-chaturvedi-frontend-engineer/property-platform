import { useCallback, useEffect, useRef, useState } from 'react';

import { toApiError } from '@/services/api/apiError';
import { notify } from '@/store/notificationStore';
import { downloadCsv } from '@/utils/csv';

import { siteVisitService } from '../services/siteVisitService';
import type { SiteVisitFilters } from '../types/siteVisit.types';
import { toSiteVisitCsv } from '../utils/siteVisitCsv';
import { propertyNow } from '../utils/siteVisitDisplay';

/** Rows per export; there is no export endpoint, so rows are fetched page by page (100 each). */
export const EXPORT_LIMIT = 5000;

/**
 * Exports every visit matching the filters as CSV. The API has no export endpoint, so the list is
 * read page by page; a running export can be cancelled and is aborted on unmount.
 */
export function useSiteVisitExport() {
  const [progress, setProgress] = useState<{ loaded: number; total: number } | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  const start = useCallback(async (filters: Omit<SiteVisitFilters, 'page' | 'size'>) => {
    if (controller.current) return;
    const current = new AbortController();
    controller.current = current;
    setProgress({ loaded: 0, total: 0 });
    try {
      const { rows, total } = await siteVisitService.listAll(filters, {
        limit: EXPORT_LIMIT,
        signal: current.signal,
        onProgress: (loaded, all) => setProgress({ loaded, total: all }),
      });
      if (rows.length === 0) {
        notify('No site visits match these filters.', 'info');
        return;
      }
      downloadCsv(toSiteVisitCsv(rows), `site-visits-${propertyNow().date}.csv`);
      notify(
        total > rows.length
          ? `Exported the first ${rows.length} of ${total} visits. Narrow the filters to export the rest.`
          : `Exported ${rows.length} visit${rows.length === 1 ? '' : 's'}.`,
        total > rows.length ? 'warning' : 'success',
      );
    } catch (error) {
      if (!current.signal.aborted) notify(`Export failed: ${toApiError(error).message}`, 'error');
    } finally {
      controller.current = null;
      setProgress(null);
    }
  }, []);

  const cancel = useCallback(() => controller.current?.abort(), []);

  return { start, cancel, progress, isExporting: progress !== null };
}
