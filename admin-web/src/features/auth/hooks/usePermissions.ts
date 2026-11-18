import { useCallback, useMemo } from 'react';

import { useAuthStore } from '@/store/authStore';

/**
 * Role-based UI checks. Roles are data on the backend and map to permission codes, so the UI checks
 * permissions, never role names. This only hides UI; the backend authorizes every request.
 */
export function usePermissions() {
  const permissions = useAuthStore((state) => state.user?.permissions);
  const granted = useMemo(() => new Set(permissions ?? []), [permissions]);

  const hasAll = useCallback(
    (required: readonly string[] = []) => required.every((permission) => granted.has(permission)),
    [granted],
  );
  const hasAny = useCallback(
    (required: readonly string[] = []) =>
      required.length === 0 || required.some((permission) => granted.has(permission)),
    [granted],
  );

  return { hasAll, hasAny, can: (permission: string) => granted.has(permission) };
}
