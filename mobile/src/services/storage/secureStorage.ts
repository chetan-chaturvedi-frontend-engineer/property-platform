import * as Keychain from 'react-native-keychain';

const SERVICE = 'propertypro.auth';

/** Auth tokens live in the OS keystore (Android Keystore / iOS Keychain), never in AsyncStorage. */
export const secureStorage = {
  async saveToken(token: string): Promise<void> {
    await Keychain.setGenericPassword('token', token, { service: SERVICE });
  },
  async getToken(): Promise<string | null> {
    const creds = await Keychain.getGenericPassword({ service: SERVICE });
    return creds ? creds.password : null;
  },
  async clearToken(): Promise<void> {
    await Keychain.resetGenericPassword({ service: SERVICE });
  },
};
