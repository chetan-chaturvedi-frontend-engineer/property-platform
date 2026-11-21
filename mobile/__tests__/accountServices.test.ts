import { accountService } from '../src/services/accountService';
import { apiClient } from '../src/services/api/apiClient';
import { authService } from '../src/services/authService';
import { secureStorage } from '../src/services/storage/secureStorage';

jest.mock('../src/services/api/apiClient', () => ({
  ...jest.requireActual('../src/services/api/apiClient'),
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), put: jest.fn(), delete: jest.fn(), deleteWithBody: jest.fn() },
}));
jest.mock('../src/services/storage/secureStorage', () => ({
  secureStorage: { getSession: jest.fn(), saveSession: jest.fn(), clearSession: jest.fn() },
}));

const api = apiClient as jest.Mocked<typeof apiClient>;
const storage = secureStorage as jest.Mocked<typeof secureStorage>;

beforeEach(() => jest.resetAllMocks());

describe('accountService.deleteAccount', () => {
  it('sends the password and then forgets the session', async () => {
    api.deleteWithBody.mockResolvedValue(undefined);
    await accountService.deleteAccount('Secret!1');
    expect(api.deleteWithBody).toHaveBeenCalledWith('/users/me', { password: 'Secret!1' });
    expect(storage.clearSession).toHaveBeenCalled();
  });

  it('keeps the session when the server refuses', async () => {
    api.deleteWithBody.mockRejectedValue(new Error('422'));
    await expect(accountService.deleteAccount('wrong')).rejects.toThrow('422');
    expect(storage.clearSession).not.toHaveBeenCalled();
  });
});

describe('authService profile calls', () => {
  it('changes the password with a confirmation and clears the session', async () => {
    api.post.mockResolvedValue(undefined);
    await authService.changePassword('Old!Pass1', 'New!Pass9');
    expect(api.post).toHaveBeenCalledWith('/users/me/change-password', { currentPassword: 'Old!Pass1', password: 'New!Pass9', passwordConfirmation: 'New!Pass9' });
    expect(storage.clearSession).toHaveBeenCalled();
  });

  it('renames and maps the returned profile', async () => {
    api.patch.mockResolvedValue({ id: 1, fullName: 'Alice Kumar', email: 'a@example.com', phone: null, status: 'active', userType: 'user', emailVerified: true, phoneVerified: false });
    await expect(authService.rename('Alice Kumar')).resolves.toEqual({ id: 1, fullName: 'Alice Kumar', email: 'a@example.com', phone: '', verified: true });
    expect(api.patch).toHaveBeenCalledWith('/users/me', { fullName: 'Alice Kumar' });
  });
});
