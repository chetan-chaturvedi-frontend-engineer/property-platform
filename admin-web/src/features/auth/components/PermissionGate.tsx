import type { ReactNode } from 'react';

import { usePermissions } from '../hooks/usePermissions';

interface PermissionGateProps {
  /** All of these are required. */
  permissions: readonly string[];
  children: ReactNode;
  fallback?: ReactNode;
}

/** Renders children only for users whose role grants the permissions. Hides UI; does not secure it. */
export function PermissionGate({ permissions, children, fallback = null }: PermissionGateProps) {
  const { hasAll } = usePermissions();
  return hasAll(permissions) ? children : fallback;
}
