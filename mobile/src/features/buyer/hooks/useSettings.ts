import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_SETTINGS, settingsService } from '../../../services/settingsService';
import { UserSettings } from '../../../types';
import { useAuth } from '../../auth/AuthProvider';

/** The signed-in user's saved settings; guests see the defaults and cannot change them. */
export function useSettings() {
  const { status } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (status !== 'signedIn') {
      setSettings(DEFAULT_SETTINGS);
      return;
    }
    let active = true;
    settingsService
      .get()
      .then(s => active && setSettings(s))
      .catch(() => active && setError('Could not load your settings.'));
    return () => {
      active = false;
    };
  }, [status]);

  /** Optimistic: the UI changes at once and rolls back if the save fails. */
  const update = useCallback(
    async (changes: Partial<UserSettings>) => {
      const previous = settings;
      setSettings({ ...settings, ...changes });
      setError(undefined);
      try {
        setSettings(await settingsService.update(changes));
      } catch {
        setSettings(previous);
        setError('Could not save that change. Try again.');
      }
    },
    [settings],
  );

  return { settings, update, error, signedIn: status === 'signedIn' };
}
