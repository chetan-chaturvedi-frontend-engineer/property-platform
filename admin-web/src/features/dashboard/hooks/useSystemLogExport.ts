import { useCallback, useEffect, useRef, useState } from 'react';

import { toApiError } from '@/services/api/apiError';
import { notify } from '@/store/notificationStore';
import { downloadCsv } from '@/utils/csv';

import { systemLogService } from '../services/systemLogService';
import type { SystemLogFilters } from '../types/systemLog.types';
import { toSystemLogCsv } from '../utils/systemLogCsv';

/** Rows per export; there is no export endpoint, so rows are fetched page by page (100 each). */
export const SYSTEM_LOG_EXPORT_LIMIT = 5000;

function today(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Exports every log matching the filters as CSV. The API has no export endpoint, so the list is
 * read page by page; a running export can be cancelled and is aborted on unmount.
 */
export function useSystemLogExport() {
  const [progress, setProgress] = useState<{ loaded: number; total: number } | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  const start = useCallback(async (filters: Omit<SystemLogFilters, 'page' | 'size'>) => {
    if (controller.current) return;
    const current = new AbortController();
    controller.current = current;
    setProgress({ loaded: 0, total: 0 });
    try {
      const { rows, total } = await systemLogService.listAll(filters, {
        limit: SYSTEM_LOG_EXPORT_LIMIT,
        signal: current.signal,
        onProgress: (loaded, all) => setProgress({ loaded, total: all }),
      });
      if (rows.length === 0) {
        notify('No logs match these filters.', 'info');
        return;
      }
      downloadCsv(toSystemLogCsv(rows), `system-logs-${today()}.csv`);
      notify(
        total > rows.length
          ? `Exported the first ${rows.length} of ${total} logs. Narrow the filters to export the rest.`
          : `Exported ${rows.length} log${rows.length === 1 ? '' : 's'}.`,
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
