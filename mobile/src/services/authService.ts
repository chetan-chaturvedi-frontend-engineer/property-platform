import { secureStorage } from './storage/secureStorage';

export const authService = {
  /** Placeholder sign-in: persists a token to secure storage. Swap for apiClient.post('/auth/login'). */
  async signIn(token: string): Promise<void> {
    await secureStorage.saveToken(token);
  },
  signOut: () => secureStorage.clearToken(),
  isSignedIn: async (): Promise<boolean> => (await secureStorage.getToken()) !== null,
};
