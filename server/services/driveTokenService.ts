import { getAdminFirestore } from './firebaseAdmin.js';

export interface DriveTokenDoc {
  uid: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt: number;
  grantedAt: number;
  driveEmail: string | null;
}

/**
 * Server-side only record. Holds the sensitive OAuth refresh token.
 * The frontend Firestore rules deny access to this collection.
 */
interface DriveTokenServerDoc {
  uid: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  updatedAt: number;
}

function driveTokensDoc(uid: string) {
  return getAdminFirestore().collection('driveTokens').doc(uid);
}

function driveTokensServerDoc(uid: string) {
  return getAdminFirestore().collection('driveTokensServer').doc(uid);
}

const inMemoryTokens = new Map<string, DriveTokenDoc>();
const inMemoryServerTokens = new Map<string, string>();

/**
 * Read a Drive token record for a user.
 *
 * Prefers the server-only `driveTokensServer` collection (which holds the OAuth
 * refresh token) and falls back to the legacy `driveTokens` doc for tokens that
 * were saved before the server-only store existed. This maintains backward
 * compatibility with existing users.
 */
export async function getDriveTokenRecord(uid: string): Promise<DriveTokenDoc | null> {
  let accessToken = '';
  let refreshToken: string | null | undefined;
  let expiresAt = 0;
  let grantedAt = 0;
  let driveEmail: string | null = null;

  // 1. Read from the legacy frontend-visible doc for metadata + access token.
  try {
    const doc = await driveTokensDoc(uid).get();
    if (doc.exists) {
      const data = doc.data() as Partial<DriveTokenDoc>;
      accessToken = data.accessToken ?? '';
      expiresAt = data.expiresAt ?? 0;
      grantedAt = data.grantedAt ?? 0;
      driveEmail = data.driveEmail ?? null;
      // Legacy fallback: if the old doc still contains a refresh token (from
      // before the server-only store existed) use it as a fallback.
      if (data.refreshToken) refreshToken = data.refreshToken;
    }
  } catch {
    // Fall through to in-memory
  }

  // 2. Read the server-only record for the authoritative refresh token.
  try {
    const serverDoc = await driveTokensServerDoc(uid).get();
    if (serverDoc.exists) {
      const data = serverDoc.data() as DriveTokenServerDoc;
      refreshToken = data.refreshToken;
      if (data.accessToken) accessToken = data.accessToken;
      if (data.expiresAt) expiresAt = data.expiresAt;
    }
  } catch {
    // Fall through to in-memory
  }

  // 3. In-memory dev fallback.
  const mem = inMemoryTokens.get(uid);
  if (!accessToken && mem?.accessToken) {
    accessToken = mem.accessToken;
    expiresAt = mem.expiresAt ?? 0;
    grantedAt = mem.grantedAt ?? 0;
    driveEmail = mem.driveEmail ?? null;
  }
  if (!refreshToken && inMemoryServerTokens.has(uid)) {
    refreshToken = inMemoryServerTokens.get(uid);
  }

  if (!accessToken) return null;
  return { uid, accessToken, refreshToken, expiresAt, grantedAt, driveEmail };
}

/**
 * Save a Drive token record for a user.
 *
 * The sensitive refresh token is written ONLY to the server-only
 * `driveTokensServer` collection — never to the frontend-visible doc. The
 * frontend-visible `driveTokens` doc receives only non-sensitive metadata and
 * a short-lived access token, so the refresh token is never exposed to the
 * browser.
 */
export async function saveDriveTokenRecord(
  uid: string,
  record: Omit<DriveTokenDoc, 'uid'>,
): Promise<void> {
  const fullRecord: DriveTokenDoc = { uid, ...record };
  inMemoryTokens.set(uid, fullRecord);

  const now = Date.now();

  // Write non-sensitive fields to the frontend-visible doc.
  // Omit the refresh token entirely.
  try {
    const publicData = {
      uid,
      accessToken: record.accessToken,
      expiresAt: record.expiresAt ?? now + 3600 * 1000,
      grantedAt: record.grantedAt ?? now,
      driveEmail: record.driveEmail ?? '',
    };
    await driveTokensDoc(uid).set(publicData);
  } catch {
    // Non-fatal fallback for dev mode
  }

  // Write the sensitive refresh token to the server-only collection.
  if (record.refreshToken) {
    inMemoryServerTokens.set(uid, record.refreshToken);
    try {
      const serverData: DriveTokenServerDoc = {
        uid,
        accessToken: record.accessToken,
        refreshToken: record.refreshToken,
        expiresAt: record.expiresAt ?? now + 3600 * 1000,
        updatedAt: now,
      };
      await driveTokensServerDoc(uid).set(serverData);
    } catch {
      // Non-fatal fallback for dev mode
    }
  }
}

/**
 * Delete both the frontend-visible token doc and the server-only token record
 * for a user. Called when a user explicitly disconnects their Drive, or when
 * a token must be revoked.
 */
export async function deleteDriveTokenRecord(uid: string): Promise<void> {
  inMemoryTokens.delete(uid);
  inMemoryServerTokens.delete(uid);
  try {
    await driveTokensDoc(uid).delete();
  } catch {
    // Non-fatal
  }
  try {
    await driveTokensServerDoc(uid).delete();
  } catch {
    // Non-fatal
  }
}

/**
 * Public-facing token info — never includes refresh token or access token.
 * Safe to return in API responses.
 */
export function getDriveTokenPublicInfo(record: DriveTokenDoc | null): {
  connected: boolean;
  driveEmail: string | null;
} | null {
  if (!record || !record.accessToken) return null;
  return { connected: true, driveEmail: record.driveEmail ?? null };
}
