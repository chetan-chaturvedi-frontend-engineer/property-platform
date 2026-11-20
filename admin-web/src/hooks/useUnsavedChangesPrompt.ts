import { useCallback, useEffect, useRef } from 'react';
import { useBlocker } from 'react-router-dom';

/**
 * Asks before leaving a page with unsaved changes: in-app navigation is blocked until the user
 * confirms (`blocker.proceed`) or stays (`blocker.reset`); closing or reloading the tab gets the
 * browser's own prompt. Call `allowNavigation` right before navigating away after a save.
 */
export function useUnsavedChangesPrompt(when: boolean) {
  const bypass = useRef(false);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      when && !bypass.current && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!when) return undefined;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [when]);

  const allowNavigation = useCallback(() => {
    bypass.current = true;
  }, []);

  return { blocker, allowNavigation };
}
