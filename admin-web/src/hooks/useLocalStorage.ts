import { useCallback, useEffect, useState } from 'react';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    // Storage blocked (private mode) or a corrupt value: use the default.
    return fallback;
  }
}

/**
 * A state value remembered in localStorage and synced across tabs. Only for harmless preferences
 * (page size, collapsed panels): never tokens, personal data or anything security-relevant.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((current: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => read(key, initialValue));

  const update = useCallback(
    (next: T | ((current: T) => T)) => {
      setValue((current) => {
        const resolved = next instanceof Function ? next(current) : next;
        try {
          // eslint-disable-next-line no-restricted-syntax -- the one sanctioned writer, for preferences only
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // Quota exceeded or storage blocked: keep the value for this session only.
        }
        return resolved;
      });
    },
    [key],
  );

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === key) {
        setValue(read(key, initialValue));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key, initialValue]);

  return [value, update];
}
