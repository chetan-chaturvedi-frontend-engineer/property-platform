import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { savedService } from '../../services/savedService';
import { useAuth } from '../auth/AuthProvider';

export type ToggleOutcome = 'saved' | 'removed' | 'needsLogin' | 'failed';

interface SavedValue {
  ids: number[];
  isSaved: (propertyId: number) => boolean;
  /** Hearts or un-hearts a property; guests are told to sign in. The heart changes at once and rolls back on failure. */
  toggle: (propertyId: number) => Promise<ToggleOutcome>;
}

const SavedContext = createContext<SavedValue | undefined>(undefined);

/** The signed-in user's saved property ids, shared so every card shows the same heart. */
export function SavedPropertiesProvider({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const [ids, setIds] = useState<number[]>([]);

  useEffect(() => {
    if (status !== 'signedIn') {
      setIds([]);
      return undefined;
    }
    let active = true;
    savedService
      .ids()
      .then(loaded => active && setIds(loaded))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [status]);

  const toggle = useCallback(
    async (propertyId: number): Promise<ToggleOutcome> => {
      if (status !== 'signedIn') {
        return 'needsLogin';
      }
      const wasSaved = ids.includes(propertyId);
      setIds(current => (wasSaved ? current.filter(id => id !== propertyId) : [propertyId, ...current]));
      try {
        await (wasSaved ? savedService.unsave(propertyId) : savedService.save(propertyId));
        return wasSaved ? 'removed' : 'saved';
      } catch {
        setIds(current => (wasSaved ? [propertyId, ...current] : current.filter(id => id !== propertyId)));
        return 'failed';
      }
    },
    [ids, status],
  );

  const value = useMemo(() => ({ ids, isSaved: (propertyId: number) => ids.includes(propertyId), toggle }), [ids, toggle]);
  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>;
}

export function useSavedProperties(): SavedValue {
  const context = useContext(SavedContext);
  if (!context) {
    throw new Error('useSavedProperties must be used inside <SavedPropertiesProvider>');
  }
  return context;
}
