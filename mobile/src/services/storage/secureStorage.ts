import * as Keychain from 'react-native-keychain';

const SERVICE = 'propertypro.auth';

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
}

/** Auth tokens live in the OS keystore (Android Keystore / iOS Keychain), never in AsyncStorage. */
export const secureStorage = {
  async saveSession(session: StoredSession): Promise<void> {
    await Keychain.setGenericPassword('session', JSON.stringify(session), { service: SERVICE });
  },
  async getSession(): Promise<StoredSession | null> {
    const creds = await Keychain.getGenericPassword({ service: SERVICE });
    if (!creds) {
      return null;
    }
    try {
      const parsed = JSON.parse(creds.password) as Partial<StoredSession>;
      return parsed.accessToken && parsed.refreshToken
        ? { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken }
        : null;
    } catch {
      return null;
    }
  },
  async clearSession(): Promise<void> {
    await Keychain.resetGenericPassword({ service: SERVICE });
  },
};
