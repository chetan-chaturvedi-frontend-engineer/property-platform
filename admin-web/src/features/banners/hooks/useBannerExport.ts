import { useCallback, useEffect, useRef, useState } from 'react';

import { toApiError } from '@/services/api/apiError';
import { notify } from '@/store/notificationStore';
import { downloadCsv } from '@/utils/csv';

import { bannerService } from '../services/bannerService';
import type { Banner, BannerFilters } from '../types/banner.types';
import { toBannerCsv } from '../utils/bannerCsv';

/** Rows per export; there is no export endpoint, so rows are read page by page (100 each). */
export const BANNER_EXPORT_LIMIT = 2000;

const fileName = () => `banners-${new Date().toISOString().slice(0, 10)}.csv`;

/** Exports the selected banners, or every banner matching the filters, as CSV; aborted on unmount. */
export function useBannerExport() {
  const [isExporting, setIsExporting] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  const exportRows = useCallback((rows: readonly Banner[]) => {
    downloadCsv(toBannerCsv(rows), fileName());
    notify(`Exported ${rows.length} banner${rows.length === 1 ? '' : 's'}.`, 'success');
  }, []);

  const exportMatching = useCallback(async (filters: Omit<BannerFilters, 'page' | 'size'>) => {
    if (controller.current) return;
    const current = new AbortController();
    controller.current = current;
    setIsExporting(true);
    try {
      const { rows, total } = await bannerService.listAll(filters, {
        limit: BANNER_EXPORT_LIMIT,
        signal: current.signal,
      });
      if (rows.length === 0) {
        notify('No banners match these filters.', 'info');
        return;
      }
      downloadCsv(toBannerCsv(rows), fileName());
      notify(
        total > rows.length
          ? `Exported the first ${rows.length} of ${total} banners. Narrow the filters to export the rest.`
          : `Exported ${rows.length} banner${rows.length === 1 ? '' : 's'}.`,
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
