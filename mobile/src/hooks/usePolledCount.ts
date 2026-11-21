import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * A server count (unread notifications or messages) kept fresh: loaded when enabled, refreshed when the app returns
 * to the foreground and every `intervalMs`. Failures keep the last value.
 */
export function usePolledCount(load: () => Promise<number>, enabled: boolean, intervalMs = 60_000) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    if (!enabled) {
      setCount(0);
      return;
    }
    load().then(setCount).catch(() => undefined);
  }, [enabled, load]);

  useEffect(() => {
    refresh();
    if (!enabled) {
      return undefined;
    }
    const timer = setInterval(refresh, intervalMs);
    const subscription = AppState.addEventListener('change', state => state === 'active' && refresh());
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [enabled, intervalMs, refresh]);

  return { count, refresh };
}
