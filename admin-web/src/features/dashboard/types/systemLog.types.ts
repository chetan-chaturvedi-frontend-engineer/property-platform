import type { PageParams } from '@/types/api.types';
import type { EntityId, IsoDateTime, Nullable } from '@/types/common.types';

/** `chk_system_logs_log_level`; the backend has no error or critical level. */
export const SYSTEM_LOG_LEVELS = ['info', 'success', 'warning'] as const;
export type SystemLogLevel = (typeof SYSTEM_LOG_LEVELS)[number];

/** The only list sort fields the backend accepts. */
export const SYSTEM_LOG_SORT_FIELDS = ['createdAt', 'id'] as const;
export type SystemLogSortField = (typeof SYSTEM_LOG_SORT_FIELDS)[number];

/** `UserAuditProfile`: who acted. Never carries passwords, tokens or document fields. */
export interface SystemLogUser {
  id: EntityId;
  fullName: string;
  email: Nullable<string>;
  phone: Nullable<string>;
  status: string;
  userType: string;
  deleted: boolean;
  createdAt: IsoDateTime;
}

/** `GET /admin/system-logs` item and `GET /admin/system-logs/{id}`. */
export interface SystemLog {
  id: EntityId;
  /** `null` for guest and system activity, and for hard-deleted accounts. */
  user: Nullable<SystemLogUser>;
  module: string;
  action: string;
  logLevel: SystemLogLevel;
  /** These four are `null` for activity outside a request (scheduled jobs). */
  ipAddress: Nullable<string>;
  userAgent: Nullable<string>;
  requestMethod: Nullable<string>;
  /** Path only; query strings are never stored. */
  requestUrl: Nullable<string>;
  referenceId: Nullable<EntityId>;
  referenceType: Nullable<string>;
  additionalData: Nullable<Record<string, unknown>>;
  createdAt: IsoDateTime;
}

/** Query parameters of `GET /admin/system-logs`; all given filters must match. */
export interface SystemLogFilters extends PageParams {
  userId?: EntityId;
  module?: string;
  logLevel?: SystemLogLevel;
  /** Exact IPv4 or IPv6 address. */
  ipAddress?: string;
  /** Case-insensitive keyword in the action text, max 100. */
  action?: string;
  referenceId?: EntityId;
  /** ISO-8601 instants, inclusive. */
  createdFrom?: IsoDateTime;
  createdTo?: IsoDateTime;
}

/** Overview card totals; each is the total of a one-row list request. */
export interface SystemLogCounts {
  total: number;
  today: number;
  warnings: number;
  denied: number;
}
