import { http, HttpResponse } from 'msw';

import type { SystemLog } from '@/features/dashboard/types/systemLog.types';
import type { PageResponse } from '@/types/api.types';

import { mockDb } from '../mocks/mockDb';

import { apiPath, problem } from './problem';

const SORT_FIELDS = ['createdAt', 'id'] as const;
type SortField = (typeof SORT_FIELDS)[number];

function isSortField(value: string): value is SortField {
  return SORT_FIELDS.some((field) => field === value);
}

function invalid(field: string, message: string) {
  return problem(400, 'validation_failed', 'Validation failed', { errors: { [field]: message } });
}

/** The session user, or the 401/403 problem the backend would answer. */
function authorize(permission: string) {
  const user = mockDb.sessionUser();
  if (!user) return { error: problem(401, 'unauthorized', 'Authentication required.') };
  if (!user.permissions.includes(permission)) {
    return { error: problem(403, 'access_denied', 'Access denied.') };
  }
  return { user };
}

/** Mirrors `AdminSystemLogController` (see backend/docs/api/system-logs.md). */
export const systemLogHandlers = [
  http.get(apiPath('/admin/system-logs'), ({ request }) => {
    const auth = authorize('SYSTEM_LOG_LIST');
    if ('error' in auth) return auth.error;
    const params = new URL(request.url).searchParams;
    const page = Number(params.get('page') ?? 0);
    const size = Number(params.get('size') ?? 20);
    // Unlike other lists, out-of-range paging is rejected, not corrected.
    if (!Number.isInteger(page) || page < 0 || page > 1_000_000) {
      return invalid('page', 'must be between 0 and 1000000');
    }
    if (!Number.isInteger(size) || size < 1 || size > 100) {
      return invalid('size', 'must be between 1 and 100');
    }
    const [sortField = 'createdAt', direction = 'desc'] = (params.get('sort') ?? '').split(',');
    if (params.get('sort') && !isSortField(sortField)) {
      return invalid('sort', `must be one of ${SORT_FIELDS.join(', ')}`);
    }
    const userId = params.get('userId');
    const module = params.get('module');
    const logLevel = params.get('logLevel');
    const ipAddress = params.get('ipAddress');
    const action = params.get('action')?.trim().toLowerCase();
    const referenceId = params.get('referenceId');
    const createdFrom = params.get('createdFrom');
    const createdTo = params.get('createdTo');
    if (logLevel && !['info', 'success', 'warning'].includes(logLevel)) {
      return invalid('logLevel', 'must be one of the allowed values');
    }
    if (action && action.length > 100) return invalid('action', 'size must be between 0 and 100');
    if (createdFrom && createdTo && Date.parse(createdTo) < Date.parse(createdFrom)) {
      return invalid('createdTo', 'must not be before the start of the range');
    }

    const field = isSortField(sortField) ? sortField : 'createdAt';
    const filtered = mockDb
      .logs()
      .filter(
        (log) =>
          (!userId || String(log.user?.id) === userId) &&
          (!module || log.module === module) &&
          (!logLevel || log.logLevel === logLevel) &&
          (!ipAddress || log.ipAddress === ipAddress) &&
          (!action || log.action.toLowerCase().includes(action)) &&
          (!referenceId || String(log.referenceId) === referenceId) &&
          (!createdFrom || Date.parse(log.createdAt) >= Date.parse(createdFrom)) &&
          (!createdTo || Date.parse(log.createdAt) <= Date.parse(createdTo)),
      )
      .sort((a, b) => {
        const result =
          field === 'id' ? a.id - b.id : Date.parse(a.createdAt) - Date.parse(b.createdAt);
        // `id` desc is the backend's tiebreaker.
        return (direction === 'asc' ? result : -result) || b.id - a.id;
      });
    const body: PageResponse<SystemLog> = {
      content: filtered.slice(page * size, page * size + size),
      page,
      size,
      totalElements: filtered.length,
      totalPages: Math.ceil(filtered.length / size),
    };
    return HttpResponse.json(body);
  }),

  http.get(apiPath('/admin/system-logs/:id'), ({ params }) => {
    const auth = authorize('SYSTEM_LOG_VIEW');
    if ('error' in auth) return auth.error;
    const id = String(params.id);
    if (!/^\d+$/.test(id)) return invalid('id', 'must be a number');
    const log = mockDb.logs().find((row) => row.id === Number(id));
    if (!log) return problem(404, 'system_log_not_found', 'System log not found.');
    return HttpResponse.json(log);
  }),
];
