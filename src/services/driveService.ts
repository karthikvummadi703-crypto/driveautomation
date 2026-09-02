import {
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  linkWithRedirect,
  reauthenticateWithRedirect,
} from 'firebase/auth';
import axios from 'axios';
import { app } from '@/firebase/app';
import { GOOGLE_DRIVE_SCOPE } from '@/config/constants';
import {
  deleteDriveToken,
  getDriveToken,
  saveDriveToken,
} from '@/services/firestoreService';
import { aiApi } from '@/services/aiService';
import type { DriveTokenRecord } from '@/types/auth';

const driveApiClient = axios.create({
  timeout: 30_000,
  headers: { Accept: 'application/json' },
});

const auth = getAuth(app);

const TOKEN_STORAGE_KEY = 'driveflow.drive.token.v1';
const ACCESS_TOKEN_TTL_MS = 55 * 60 * 1000;

const DRIVE_API_ENABLE_URL =
  'https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=984526389105';

type StoredDriveToken = Omit<DriveTokenRecord, 'uid'> & { uid: string };

function readStoredToken(uid: string): StoredDriveToken | null {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDriveToken;
    if (!parsed || parsed.uid !== uid || typeof parsed.accessToken !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function cacheDriveAccessToken(
  uid: string,
  accessToken: string,
  driveEmail: string | null = null,
  refreshToken?: string | null,
): void {
  const stored: StoredDriveToken = {
    uid,
    accessToken,
    refreshToken: refreshToken ?? null,
    driveEmail,
    expiresAt: Date.now() + ACCESS_TOKEN_TTL_MS,
    grantedAt: Date.now(),
  };
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(stored));
}

export async function getStoredDriveToken(uid: string): Promise<StoredDriveToken | null> {
  const cached = readStoredToken(uid);
  if (cached && cached.expiresAt > Date.now() - 60_000) {
    return cached;
  }
  try {
    const record = await getDriveToken(uid);
    if (record && typeof record.accessToken === 'string') {
      const stored: StoredDriveToken = {
        uid,
        accessToken: record.accessToken,
        refreshToken: record.refreshToken ?? null,
        driveEmail: record.driveEmail ?? null,
        expiresAt: record.expiresAt,
        grantedAt: record.grantedAt,
      };
      localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(stored));
      return stored;
    }
  } catch {
    // Proceed to server fallback
  }

  // Query server-side token store (/api/drive/token)
  const serverToken = await refreshFromServer(uid);
  if (serverToken) {
    return serverToken;
  }

  return cached;
}

export async function clearDriveToken(uid: string): Promise<void> {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  try {
    await deleteDriveToken(uid);
  } catch {
    // Ignore Firestore cleanup failures; the local cache is already gone.
  }
}

/**
 * Persist the access token obtained from a Google sign-in popup as a Drive
 * token. Called automatically after `signInWithGoogle` succeeds — the user
 * never needs to click "Connect Drive" separately.
 */
export async function autoConnectFromGoogleSignIn(
  uid: string,
  accessToken: string,
  driveEmail: string | null,
): Promise<void> {
  cacheDriveAccessToken(uid, accessToken, driveEmail);
  const record: DriveTokenRecord = {
    uid,
    accessToken,
    refreshToken: null,
    driveEmail,
    expiresAt: Date.now() + ACCESS_TOKEN_TTL_MS,
    grantedAt: Date.now(),
  };
  try {
    await saveDriveToken(uid, record);
  } catch {
    // Firestore unavailable — the local cache still allows this session to work.
  }
}


export async function hasUsableDriveToken(uid: string): Promise<boolean> {
  const stored = await getStoredDriveToken(uid);
  if (stored && stored.expiresAt > Date.now() + 60_000) return true;
  const refreshed = await refreshFromServer(uid);
  return Boolean(refreshed);
}

export function createDriveProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.addScope(GOOGLE_DRIVE_SCOPE);
  provider.setCustomParameters({
    prompt: 'consent',
    access_type: 'offline',
    include_granted_scopes: 'true',
  });
  return provider;
}

/**
 * Returns a usable access token using ONLY silent sources:
 * localStorage → Firestore → server refresh.
 * Never opens a GIS popup or triggers a redirect.
 * Used for background tasks like fetching storage quota.
 */
export async function getStoredAccessTokenSilent(uid: string): Promise<string | null> {
  // 1. Try localStorage / Firestore token if available.
  const stored = await getStoredDriveToken(uid);
  if (stored && stored.accessToken) {
    return stored.accessToken;
  }
  // 2. Try silent server-side refresh (uses stored refresh token on backend).
  const refreshed = await refreshFromServer(uid);
  if (refreshed) return refreshed.accessToken;
  // 3. Token is unavailable — caller handles null.
  return null;
}


interface GisTokenResponse {
  access_token: string;
  scope: string;
  expires_in: number;
  token_type: string;
  error?: string;
  error_description?: string;
}

const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) || '';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: GisTokenResponse) => void;
            prompt?: string;
          }) => {
            requestAccessToken: (config: { prompt?: string; hint?: string }) => void;
          };
        };
      };
    };
  }
}

export function gisConfigured(): boolean {
  return Boolean(GOOGLE_CLIENT_ID);
}

function loadGisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window.google !== 'undefined') {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = 'gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services.'));
    document.head.appendChild(script);
  });
}

/**
 * Obtains a Google OAuth access token (and, on first consent, a refresh token)
 * directly via Google Identity Services. This requires a Google OAuth web
 * client (VITE_GOOGLE_CLIENT_ID) configured with the drive.file scope. The
 * refresh token is what lets a Drive connection persist across devices.
 */
async function connectWithGis(hintEmail?: string): Promise<{
  accessToken: string;
  refreshToken?: string;
}> {
  if (!gisConfigured()) {
    throw new Error(
      'VITE_GOOGLE_CLIENT_ID is not set. Configure the Google OAuth web client to enable Drive.',
    );
  }
  await loadGisScript();
  if (!window.google) throw new Error('Google Identity Services failed to initialize.');

  console.log('[drive] origin=', window.location.origin, 'clientId=', GOOGLE_CLIENT_ID.slice(0, 7), 'scope=', GOOGLE_DRIVE_SCOPE);

  return new Promise((resolve, reject) => {
    const tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GOOGLE_DRIVE_SCOPE,
      prompt: '',
      callback: (resp) => {
        if (resp.error) {
          reject(new Error(resp.error_description || resp.error || 'Google sign-in failed.'));
          return;
        }
        if (!resp.access_token) {
          reject(new Error('No Google access token returned.'));
          return;
        }
        // refresh_token is only present in the response on the first consent
        // (never on subsequent silent refreshes).
        resolve({
          accessToken: resp.access_token,
          refreshToken: (resp as { refresh_token?: string }).refresh_token,
        });
      },
    });
    tokenClient.requestAccessToken({ prompt: 'consent', hint: hintEmail });
  });
}

export function isGoogleProviderUser(): boolean {
  const user = auth.currentUser;
  return Boolean(user?.providerData.some((p) => p.providerId === 'google.com'));
}

export function isDriveApiDisabledError(message: string): boolean {
  return /has not been used in project .+? before or it is disabled/i.test(message);
}

export function driveApiDisabledMessage(): string {
  return `Google Drive API is not enabled for this project. Enable it at ${DRIVE_API_ENABLE_URL}, wait a few minutes for it to activate, then reconnect and try again.`;
}

function normalizeAuthError(error: unknown): Error {
  if (error instanceof Error && 'code' in error) {
    const code = (error as { code?: string }).code;
    switch (code) {
      case 'auth/popup-closed-by-user':
        return new Error('Google sign-in was cancelled.');
      case 'auth/popup-blocked':
        return new Error('The sign-in popup was blocked. Allow popups for this site and try again.');
      case 'auth/user-mismatch':
        return new Error('You chose a different Google account than the one you signed in with.');
      case 'auth/account-exists-with-different-credential':
        return new Error(
          'This Google account is already used by another DriveFlow account. Sign in with the Google account that matches your login email.',
        );
      case 'auth/credential-already-in-use':
        return new Error(
          'This Google account is already linked to another DriveFlow account. Use the Google account that matches your login email.',
        );
      case 'auth/email-already-in-use':
        return new Error('This email is already in use by another account.');
      case 'auth/cancelled-popup-request':
        return new Error('Google sign-in was cancelled.');
      case 'auth/provider-already-linked':
        return new Error(
          'Your Google account is already linked. Please connect Google Drive from the account settings instead of signing in again.',
        );
      default:
        if (isDriveApiDisabledError(error.message)) {
          return new Error(driveApiDisabledMessage());
        }
        return new Error(
          `Could not connect Google Drive: ${error.message}. Make sure the Google Drive scope is enabled in the Firebase OAuth consent screen.`,
        );
    }
  }
  if (error instanceof Error && isDriveApiDisabledError(error.message)) {
    return new Error(driveApiDisabledMessage());
  }
  return error instanceof Error ? error : new Error('Could not connect Google Drive.');
}

const REFRESH_BEFORE_MS = 5 * 60 * 1000;

export async function refreshFromServer(uid: string): Promise<StoredDriveToken | null> {
  try {
    const accessToken = await aiApi.refreshDriveToken();
    if (!accessToken) return null;
    const stored: StoredDriveToken = {
      uid,
      accessToken,
      refreshToken: null,
      driveEmail: null,
      expiresAt: Date.now() + ACCESS_TOKEN_TTL_MS,
      grantedAt: Date.now(),
    };
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(stored));
    return stored;
  } catch {
    return null;
  }
}

export async function getDriveAccessToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be signed in to upload.');

  const stored = await getStoredDriveToken(user.uid);
  if (stored && stored.expiresAt > Date.now() + REFRESH_BEFORE_MS) {
    return stored.accessToken;
  }

  const serverRefreshed = await refreshFromServer(user.uid);
  if (serverRefreshed) return serverRefreshed.accessToken;

  const driveEmailHint = stored?.driveEmail ?? user.email ?? undefined;

  if (gisConfigured()) {
    console.log('[drive] choosing GIS path, origin=', window.location.origin);
    try {
      const { accessToken, refreshToken } = await connectWithGis(driveEmailHint ?? undefined);
      const driveEmail = stored?.driveEmail ?? user.email ?? null;
      cacheDriveAccessToken(user.uid, accessToken, driveEmail, refreshToken);
      const record: DriveTokenRecord = {
        uid: user.uid,
        accessToken,
        refreshToken: refreshToken ?? null,
        driveEmail,
        expiresAt: Date.now() + ACCESS_TOKEN_TTL_MS,
        grantedAt: Date.now(),
      };
      try {
        await saveDriveToken(user.uid, record);
      } catch {
        // Firestore unavailable — the local cache still lets this session upload.
      }
      return accessToken;
    } catch (err) {
      throw normalizeAuthError(err);
    }
  }

  const isGoogleAccount = user.providerData.some((p) => p.providerId === 'google.com');

  try {
    const provider = createDriveProvider();

    // Prefer the redirect flow for establishing/refreshing a Drive connection.
    // Redirect cannot be blocked by the browser the way popups can, so this is
    // the most reliable path for first-time and "change Drive" connects. The
    // result is finalized on the next page load by completeRedirectConnect().
    console.log('[drive] choosing REDIRECT path, origin=', window.location.origin);
    if (isGoogleAccount) {
      await reauthenticateWithRedirect(user, provider);
    } else {
      await linkWithRedirect(user, provider);
    }
    throw new Error('Redirecting to Google to connect Drive...');
  } catch (err) {
    throw normalizeAuthError(err);
  }
}

/**
 * Called once on app mount / page load. If the user was redirected back from
 * Google (redirect-based Drive connection), this resolves the pending result,
 * persists the resulting access token, and returns it.
 */
export async function completeRedirectConnect(): Promise<StoredDriveToken | null> {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    const result = await getRedirectResult(auth);
    const credential = result ? GoogleAuthProvider.credentialFromResult(result) : null;
    if (!credential?.accessToken) return null;

    const driveEmail =
      result!.user.providerData.find((p) => p.providerId === 'google.com')?.email ??
      user.email ??
      null;
    cacheDriveAccessToken(user.uid, credential.accessToken, driveEmail);
    const record: DriveTokenRecord = {
      uid: user.uid,
      accessToken: credential.accessToken,
      driveEmail,
      expiresAt: Date.now() + ACCESS_TOKEN_TTL_MS,
      grantedAt: Date.now(),
    };
    try {
      await saveDriveToken(user.uid, record);
    } catch {
      // Firestore unavailable — the local cache still lets this session upload.
    }
    return {
      uid: user.uid,
      accessToken: credential.accessToken,
      refreshToken: null,
      driveEmail,
      expiresAt: record.expiresAt,
      grantedAt: record.grantedAt,
    };
  } catch {
    return null;
  }
}

export interface DriveStorageQuota {
  limit: number;
  usage: number;
  usageInDrive: number;
  usageInDriveTrash?: number;
}

export async function getDriveStorageQuota(
  accessToken: string,
): Promise<DriveStorageQuota> {
  const { data } = await driveApiClient.get<{
    storageQuota?: Record<string, string | number>;
  }>('https://www.googleapis.com/drive/v3/about', {
    params: { fields: 'storageQuota(limit,usage,usageInDrive,usageInDriveTrash)' },
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!data.storageQuota) throw new Error('Google Drive did not return storage information.');
  const raw = data.storageQuota;
  return {
    limit: raw.limit != null ? Number(raw.limit) : 0,
    usage: raw.usage != null ? Number(raw.usage) : 0,
    usageInDrive: raw.usageInDrive != null ? Number(raw.usageInDrive) : 0,
    usageInDriveTrash: raw.usageInDriveTrash != null ? Number(raw.usageInDriveTrash) : 0,
  };
}
