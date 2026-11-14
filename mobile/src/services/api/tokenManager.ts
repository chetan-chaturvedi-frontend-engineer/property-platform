import { env } from '../../config/env';
import { ApiTokenResponse } from '../../types/api';
import { secureStorage } from '../storage/secureStorage';

type ExpiredListener = () => void;
let expiredListener: ExpiredListener | undefined;
let inflight: Promise<string | null> | undefined;

/** Called once by the auth provider; fired when the refresh token is rejected (signed out). */
export function onSessionExpired(listener: ExpiredListener | undefined): void {
  expiredListener = listener;
}

export async function getAccessToken(): Promise<string | null> {
  return (await secureStorage.getSession())?.accessToken ?? null;
}

/**
 * Exchanges the refresh token for a new pair (the backend rotates it, so concurrent callers must
 * share one request). Returns the new access token, or null when the session is gone.
 */
export function refreshAccessToken(): Promise<string | null> {
  if (!inflight) {
    inflight = doRefresh().finally(() => {
      inflight = undefined;
    });
  }
  return inflight;
}

async function doRefresh(): Promise<string | null> {
  const session = await secureStorage.getSession();
  if (!session) {
    return null;
  }
  try {
    const response = await fetch(`${env.apiBaseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    if (response.ok) {
      const tokens = (await response.json()) as ApiTokenResponse;
      await secureStorage.saveSession({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
      return tokens.accessToken;
    }
    if (response.status === 400 || response.status === 401 || response.status === 403) {
      await secureStorage.clearSession();
      expiredListener?.();
    }
  } catch {
    // Network failure: keep the session, the caller reports the original error.
  }
  return null;
}
