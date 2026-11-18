import type { PageParams } from '@/types/api.types';
import type { EntityId, IsoDateTime, Nullable } from '@/types/common.types';

export type SystemLogLevel = 'info' | 'success' | 'warning';

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

/** `GET /admin/system-logs` item. */
export interface SystemLog {
  id: EntityId;
  user: Nullable<SystemLogUser>;
  module: string;
  action: string;
  logLevel: SystemLogLevel;
  ipAddress: Nullable<string>;
  userAgent: Nullable<string>;
  requestMethod: Nullable<string>;
  requestUrl: Nullable<string>;
  referenceId: Nullable<EntityId>;
  referenceType: Nullable<string>;
  additionalData: Nullable<Record<string, unknown>>;
  createdAt: IsoDateTime;
}

export interface SystemLogFilters extends PageParams {
  module?: string;
  logLevel?: SystemLogLevel;
}
