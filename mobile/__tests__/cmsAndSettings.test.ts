import { toBanner, toCmsPage, toFaq } from '../src/services/mappers/cmsMapper';
import { ApiError, apiClient } from '../src/services/api/apiClient';
import { settingsService } from '../src/services/settingsService';

jest.mock('../src/services/api/apiClient', () => {
  const actual = jest.requireActual('../src/services/api/apiClient');
  return { ...actual, apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn() } };
});
const api = apiClient as jest.Mocked<typeof apiClient>;

describe('cms mappers', () => {
  it('converts page and FAQ HTML to text', () => {
    expect(toCmsPage({ heading: 'Privacy', subHeading: null, slug: 'privacy-policy', content: '<p>Hello</p>' })).toEqual({ heading: 'Privacy', body: 'Hello' });
    expect(toFaq({ id: 1, question: 'Q?', answer: '<p>A &amp; B</p>', category: 'general', categoryLabel: 'General', sortOrder: 1 })).toEqual({ id: 1, question: 'Q?', answer: 'A & B', category: 'general' });
  });
  it('makes banner image URLs absolute and skips banners without one', () => {
    const banner = { id: 1, title: 'Sale', type: 'offer', placement: 'home_top', linkType: null, link: null, imageUrl: '/api/v1/public/banners/1/image/a.webp' };
    expect(toBanner(banner)?.imageUrl).toMatch(/^https?:\/\/.+\/api\/v1\/public\/banners\/1\/image\/a\.webp$/);
    expect(toBanner({ ...banner, imageUrl: '' })).toBeNull();
  });
});

describe('settingsService', () => {
  const stored = { id: 1, location: 'Pune', theme: 'dark', language: 'hi', notificationEnabled: false, emailNotifications: true, pushNotifications: true, smsNotifications: false, timezone: 'UTC' };
  beforeEach(() => jest.resetAllMocks());

  it('maps stored settings and returns defaults when none exist', async () => {
    api.get.mockResolvedValueOnce(stored);
    await expect(settingsService.get()).resolves.toEqual({ location: 'Pune', theme: 'dark', language: 'hi', notificationsEnabled: false });
    api.get.mockRejectedValueOnce(new ApiError('none', 404, 'user_settings_not_found'));
    await expect(settingsService.get()).resolves.toMatchObject({ language: 'en', notificationsEnabled: true });
  });

  it('patches existing settings with only the changed fields', async () => {
    api.patch.mockResolvedValueOnce({ ...stored, notificationEnabled: true });
    await settingsService.update({ notificationsEnabled: true });
    expect(api.patch).toHaveBeenCalledWith('/user-settings', { notificationEnabled: true });
  });

  it('creates the row on first save and clears a blank location', async () => {
    api.patch.mockRejectedValueOnce(new ApiError('none', 404));
    api.post.mockResolvedValueOnce(stored);
    await settingsService.update({ location: '  ' });
    expect(api.post).toHaveBeenCalledWith('/user-settings', { location: null });
  });

  it('does not swallow other errors', async () => {
    api.patch.mockRejectedValueOnce(new ApiError('boom', 500));
    await expect(settingsService.update({ language: 'en' })).rejects.toMatchObject({ status: 500 });
  });
});
