import { UserSettings } from '../types';
import { ApiUserSettings } from '../types/api';
import { ApiError, apiClient } from './api/apiClient';

export const DEFAULT_SETTINGS: UserSettings = {
  location: '',
  theme: 'system',
  language: 'en',
  notificationsEnabled: true,
};

function toSettings(s: ApiUserSettings): UserSettings {
  return {
    location: s.location ?? '',
    theme: s.theme,
    language: s.language,
    notificationsEnabled: s.notificationEnabled,
  };
}

function toPayload(changes: Partial<UserSettings>) {
  return {
    ...(changes.location !== undefined ? { location: changes.location.trim() || null } : {}),
    ...(changes.theme !== undefined ? { theme: changes.theme } : {}),
    ...(changes.language !== undefined ? { language: changes.language } : {}),
    ...(changes.notificationsEnabled !== undefined ? { notificationEnabled: changes.notificationsEnabled } : {}),
  };
}

export const settingsService = {
  /** The caller's settings; a user who never saved any gets the defaults (the backend returns 404). */
  async get(): Promise<UserSettings> {
    try {
      return toSettings(await apiClient.get<ApiUserSettings>('/user-settings'));
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        return DEFAULT_SETTINGS;
      }
      throw e;
    }
  },

  /** Saves changes: the first save creates the row (POST), later saves patch it. */
  async update(changes: Partial<UserSettings>): Promise<UserSettings> {
    const body = toPayload(changes);
    try {
      return toSettings(await apiClient.patch<ApiUserSettings>('/user-settings', body));
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        return toSettings(await apiClient.post<ApiUserSettings>('/user-settings', body));
      }
      throw e;
    }
  },
};
