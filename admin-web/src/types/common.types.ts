import type { ReactNode } from 'react';

export type Nullable<T> = T | null;

export type EntityId = number;

/** ISO-8601 UTC timestamp string as sent by the API. */
export type IsoDateTime = string;

export type ThemeMode = 'light' | 'dark' | 'system';

export interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
  /** The item is shown only when the user holds every listed permission. */
  requiredPermissions?: readonly string[];
}

export interface NavSection {
  /** Visible heading; the first section may have none. */
  title?: string;
  items: readonly NavItem[];
}
