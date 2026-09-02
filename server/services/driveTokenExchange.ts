const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

/**
 * Token refresh can fail because the refresh token was revoked, expired, or
 * the associated Google account was deleted. In those cases the client can no
 * longer reauthorize silently and must re-run the OAuth consent flow.
 */
export class TokenRevokedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenRevokedError';
  }
}

/**
 * Exchanges a Google OAuth refresh token for a fresh access token.
 *
 * Requires the server environment to be configured with the Google OAuth web
 * client credentials (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) that were used
 * during the Google Account consent flow. These are never exposed to the client.
 */
export async function exchangeRefreshToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresIn: number }> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'Server is not configured for Drive token refresh. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
    );
  }

  let response: Response;
  try {
    response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    console.error('[drive] token exchange network error:', err instanceof Error ? err.message : err);
    throw new Error('Unable to reach Google token service.');
  }

  if (!response.ok) {
    const errorBody = await response.text();
    let errorCode = '';
    let errorDescription = '';
    try {
      const parsed = JSON.parse(errorBody) as {
        error?: string;
        error_description?: string;
      };
      errorCode = parsed.error ?? '';
      errorDescription = parsed.error_description ?? '';
    } catch {
      // Non-JSON error body — use status text below
    }

    // Do not log the raw error body if it might contain secret material.
    console.error(
      `[drive] refresh failed (${response.status}) code=${errorCode || 'unknown'} desc=${
        errorDescription ? 'present' : 'none'
      }`,
    );

    // Handle revoked/invalid grant — the user must reconnect.
    if (/invalid_grant|revoked|deleted_client|invalid_client/i.test(errorCode) || response.status === 401 || response.status === 400) {
      throw new TokenRevokedError(
        'The Google Drive authorization has been revoked or expired. Please reconnect Google Drive.',
      );
    }

    if (response.status === 429) {
      throw new Error('Google token service is rate-limited. Please wait and try again.');
    }

    if (response.status >= 500) {
      throw new Error('Google token service is temporarily unavailable.');
    }

    throw new Error('Unable to refresh Google Drive access token.');
  }

  const data = (await response.json()) as { access_token?: string; expires_in?: number };

  if (!data.access_token) {
    throw new Error('Google Drive token refresh returned no access token.');
  }

  return { accessToken: data.access_token, expiresIn: data.expires_in ?? 3600 };
}
