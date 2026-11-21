import { apiClient } from './api/apiClient';
import { secureStorage } from './storage/secureStorage';

export const accountService = {
  /**
   * Permanently deletes the account (soft delete on the server: sessions end and its properties are archived).
   * The password confirms it is the owner. Required in-app by Google Play and App Store guideline 5.1.1(v).
   */
  async deleteAccount(password: string): Promise<void> {
    await apiClient.deleteWithBody<void>('/users/me', { password });
    await secureStorage.clearSession();
  },
};
