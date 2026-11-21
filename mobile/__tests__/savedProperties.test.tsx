import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { SavedPropertiesProvider, useSavedProperties } from '../src/features/buyer/SavedPropertiesProvider';
import { savedService } from '../src/services/savedService';

let mockStatus = 'signedIn';
jest.mock('../src/features/auth/AuthProvider', () => ({ useAuth: () => ({ status: mockStatus }) }));
jest.mock('../src/services/savedService');

const service = savedService as jest.Mocked<typeof savedService>;
const wrapper = ({ children }: { children: React.ReactNode }) => <SavedPropertiesProvider>{children}</SavedPropertiesProvider>;

beforeEach(() => {
  jest.resetAllMocks();
  mockStatus = 'signedIn';
  service.ids.mockResolvedValue([7]);
  service.save.mockResolvedValue(undefined);
  service.unsave.mockResolvedValue(undefined);
});

describe('SavedPropertiesProvider', () => {
  it('loads the saved ids when signed in', async () => {
    const { result } = await renderHook(() => useSavedProperties(), { wrapper });
    await waitFor(() => expect(result.current.isSaved(7)).toBe(true));
    expect(result.current.isSaved(8)).toBe(false);
  });

  it('hearts and un-hearts with the matching request', async () => {
    const { result } = await renderHook(() => useSavedProperties(), { wrapper });
    await waitFor(() => expect(result.current.ids).toEqual([7]));
    await act(async () => expect(await result.current.toggle(8)).toBe('saved'));
    expect(service.save).toHaveBeenCalledWith(8);
    expect(result.current.ids).toEqual([8, 7]);
    await act(async () => expect(await result.current.toggle(7)).toBe('removed'));
    expect(service.unsave).toHaveBeenCalledWith(7);
    expect(result.current.ids).toEqual([8]);
  });

  it('rolls the heart back when the request fails', async () => {
    service.save.mockRejectedValueOnce(new Error('offline'));
    const { result } = await renderHook(() => useSavedProperties(), { wrapper });
    await waitFor(() => expect(result.current.ids).toEqual([7]));
    await act(async () => expect(await result.current.toggle(9)).toBe('failed'));
    expect(result.current.isSaved(9)).toBe(false);
  });

  it('asks guests to sign in and sends nothing', async () => {
    mockStatus = 'signedOut';
    const { result } = await renderHook(() => useSavedProperties(), { wrapper });
    await act(async () => expect(await result.current.toggle(8)).toBe('needsLogin'));
    expect(service.save).not.toHaveBeenCalled();
    expect(service.ids).not.toHaveBeenCalled();
    expect(result.current.ids).toEqual([]);
  });
});
