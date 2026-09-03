import { generateOAuthState } from './oauthState.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

export const DRIVE_SCOPE = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.activity.readonly',
].join(' ');

/**
 * The OAuth redirect URI registered in Google Cloud Console for this backend.
 * Configurable via GOOGLE_REDIRECT_URI; defaults to the local backend callback
 * so development works out of the box on http://localhost:3001.
 */
export function getDriveRedirectUri(): string {
  return (
    process.env.GOOGLE_REDIRECT_URI ||
    'http://localhost:3001/api/drive/oauth/callback'
  );
}

/**
 * Builds the Google OAuth authorization URL for the server-side Drive connect
 * flow. Uses `response_type=code` + `access_type=offline` + `prompt=consent` so
 * Google returns a refresh token which the backend exchanges (with the client
 * secret) and stores server-side only.
 */
export function buildDriveAuthorizationUrl(uid: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID is not configured for Drive OAuth.');
  }

  const state = generateOAuthState(uid);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getDriveRedirectUri(),
    response_type: 'code',
    scope: DRIVE_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}
