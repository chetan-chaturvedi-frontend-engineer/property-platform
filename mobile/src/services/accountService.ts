import { apiClient } from './api/apiClient';
import { authService } from './authService';

export const accountService = {
  /**
   * Permanently deletes the account and associated data server-side, then clears local credentials.
   * Required in-app by Google Play (account deletion) and App Store guideline 5.1.1(v).
   */
  async deleteAccount(): Promise<void> {
    await apiClient.delete<void>('/account');
    await authService.signOut();
  },
};
