import { Router } from 'express';
import { authenticateFirebaseUser, requireVerifiedEmail } from '../middleware/auth.js';
import { getAdminAuth } from '../services/firebaseAdmin.js';
import {
  getDriveTokenRecord,
  saveDriveTokenRecord,
  deleteDriveTokenRecord,
  getDriveTokenPublicInfo,
} from '../services/driveTokenService.js';
import { exchangeRefreshToken, exchangeAuthorizationCode, TokenRevokedError } from '../services/driveTokenExchange.js';
import {
  buildDriveAuthorizationUrl,
  getDriveRedirectUri,
} from '../services/driveOAuth.js';
import { verifyOAuthState } from '../services/oauthState.js';
import {
  getStorageQuota,
  getDriveAnalytics,
  getRecentDriveFiles,
  searchDriveFiles,
  getUsableAccessToken,
  DriveConnectionError,
  DriveReauthRequiredError,
  notifyDriveDisconnected,
  type DriveStorageQuota,
  type DriveAnalytics,
  type DriveFileMetadata,
} from '../services/driveService.js';
import { getDriveActivity } from '../services/driveActivityService.js';

const router = Router();

const FRONTEND_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';
const FRONTEND_CONNECT_OK = `${FRONTEND_BASE_URL}/connect-drive?status=success`;
const FRONTEND_CONNECT_ERROR = (reason: string) =>
  `${FRONTEND_BASE_URL}/connect-drive?status=error&reason=${encodeURIComponent(reason)}`;

/**
 * GET /api/drive/oauth/callback  (PUBLIC — reached by a browser redirect from Google)
 *
 * OAuth redirect_uri for the server-side Drive connect flow. Exchanges the
 * authorization code for access + refresh tokens, persists them server-side
 * ONLY (refresh token never reaches the client), then redirects the browser
 * back to the frontend success/error page.
 *
 * This route must be declared before the authenticateFirebaseUser middleware
 * because Google redirects the browser here without a Firebase ID token.
 */
router.get('/oauth/callback', async (req, res) => {
  const code = typeof req.query.code === 'string' ? req.query.code : null;
  const state = typeof req.query.state === 'string' ? req.query.state : null;
  const error = typeof req.query.error === 'string' ? req.query.error : null;

  if (error) {
    res.redirect(FRONTEND_CONNECT_ERROR(`oauth_error:${error}`));
    return;
  }

  if (!code) {
    res.redirect(FRONTEND_CONNECT_ERROR('missing_code'));
    return;
  }

  const uid = state ? verifyOAuthState(state) : null;
  if (!uid) {
    res.redirect(FRONTEND_CONNECT_ERROR('invalid_state'));
    return;
  }

  try {
    const redirectUri = getDriveRedirectUri();
    const { accessToken, refreshToken, expiresIn } = await exchangeAuthorizationCode(code, redirectUri);

    // Only persist credentials for users whose account email is verified.
    // Google-authenticated accounts are inherently verified; email/password
    // users must confirm their email before their Drive credentials are stored.
    let verified = false;
    try {
      const auth = getAdminAuth();
      const userRecord = await auth.getUser(uid);
      const isGoogle = userRecord.providerData[0]?.providerId === 'google.com';
      verified = isGoogle || Boolean(userRecord.emailVerified);
    } catch {
      verified = false;
    }
    if (!verified) {
      res.redirect(FRONTEND_CONNECT_ERROR('email_not_verified'));
      return;
    }

    // Determine the connected Drive account email so the UI can show it.
    let driveEmail: string | null = null;
    try {
      const aboutRes = await fetch(
        'https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)',
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (aboutRes.ok) {
        const about = (await aboutRes.json()) as { user?: { emailAddress?: string } };
        driveEmail = about.user?.emailAddress ?? null;
      }
    } catch {
      // Non-fatal — email display is cosmetic; the connection is still valid.
    }

    const now = Date.now();
    await saveDriveTokenRecord(uid, {
      accessToken,
      refreshToken,
      expiresAt: now + expiresIn * 1000,
      grantedAt: now,
      driveEmail,
    });

    res.redirect(FRONTEND_CONNECT_OK);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[drive] OAuth callback exchange error: ${message}`);
    res.redirect(FRONTEND_CONNECT_ERROR('token_exchange_failed'));
  }
});

// All remaining Drive routes require a valid Firebase ID token.
router.use(authenticateFirebaseUser);

/**
 * GET /api/drive/oauth/start  (authenticated)
 *
 * Returns the Google OAuth authorization URL for the server-side Drive connect
 * flow. The frontend navigates the browser to this URL. On success Google
 * redirects to /api/drive/oauth/callback which stores the tokens server-side.
 */
router.get('/oauth/start', async (req, res) => {
  try {
    const uid = req.user!.uid;
    const url = buildDriveAuthorizationUrl(uid);
    res.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[drive] OAuth start error: ${message}`);
    res.status(500).json({ error: message });
  }
});
// NOTE: requireVerifiedEmail is NOT applied globally here.
// Token refresh, status, save, and disconnect are allowed for all
// authenticated users so email/password users can connect their Drive
// before (and after) verifying their email. Email verification is only
// required on the sensitive data-access routes (storage, analytics, etc.).

const MIN_REFRESH_MARGIN_MS = 5 * 60 * 1000;

/**
 * POST /api/drive/connect
 *
 * Receives OAuth access + refresh tokens obtained by the frontend via the
 * Google Identity Services (GIS) consent popup, and persists them to the
 * server-side token store. The refresh token is written ONLY to the
 * server-only `driveTokensServer` collection — never exposed to the client.
 *
 * This is the primary entry point for establishing (or re-establishing) a
 * Drive connection for the authenticated user. Calling it again with new
 * tokens effectively replaces the connection (used for "Change Drive").
 */
router.post('/connect', async (req, res) => {
  try {
    const uid = req.user!.uid;

    // Harden: only persist Drive credentials once the account email is
    // verified. Google-authenticated accounts are inherently verified;
    // email/password users must confirm their email first.
    if (req.user!.provider !== 'google.com' && !req.user!.emailVerified) {
      res.status(403).json({
        error: 'Please verify your email address before connecting Google Drive.',
        code: 'EMAIL_NOT_VERIFIED',
      });
      return;
    }

    const { accessToken, refreshToken, driveEmail } = req.body as {
      accessToken?: unknown;
      refreshToken?: unknown;
      driveEmail?: unknown;
    };

    if (typeof accessToken !== 'string' || accessToken.trim().length === 0) {
      res.status(400).json({ error: 'Access token is required.' });
      return;
    }

    if (refreshToken != null && typeof refreshToken !== 'string') {
      res.status(400).json({ error: 'Refresh token must be a string if provided.' });
      return;
    }

    if (driveEmail != null && typeof driveEmail !== 'string') {
      res.status(400).json({ error: 'Drive email must be a string if provided.' });
      return;
    }

    const now = Date.now();
    // Conservative expiry (GIS tokens default to ~1 hour; 55 min margin).
    const expiresAt = now + 55 * 60 * 1000;

    await saveDriveTokenRecord(uid, {
      accessToken,
      refreshToken: refreshToken ?? null,
      expiresAt,
      grantedAt: now,
      driveEmail: driveEmail ?? null,
    });

    res.json({ connected: true, driveEmail: driveEmail ?? null });
  } catch (error) {
    console.error(`[drive] Connect error:`, error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Unable to save Drive connection.' });
  }
});

/**
 * POST /api/drive/token
 *
 * Returns a usable Google Drive access token for the authenticated user.
 * If the stored access token is still valid, it is returned as-is. If it is
 * expired or about to expire, the server exchanges the stored refresh token
 * for a fresh one and persists it back. Never exposes the refresh token.
 */
router.post('/token', async (req, res) => {
  try {
    const uid = req.user!.uid;
    const record = await getDriveTokenRecord(uid);

    if (!record || !record.accessToken) {
      res.status(404).json({ error: 'No Drive connection found. Please connect Google Drive.' });
      return;
    }

    const now = Date.now();
    if (record.expiresAt > now + MIN_REFRESH_MARGIN_MS && record.accessToken) {
      res.json({ accessToken: record.accessToken });
      return;
    }

    if (!record.refreshToken) {
      res.status(400).json({
        error:
          'This Drive connection cannot be refreshed automatically. Please reconnect Google Drive.',
      });
      return;
    }

    const { accessToken, expiresIn } = await exchangeRefreshToken(record.refreshToken);
    const expiresAt = now + expiresIn * 1000;

    await saveDriveTokenRecord(uid, {
      accessToken,
      refreshToken: record.refreshToken,
      expiresAt,
      grantedAt: record.grantedAt,
      driveEmail: record.driveEmail ?? null,
    });

    res.json({ accessToken });
  } catch (error) {
    if (error instanceof TokenRevokedError) {
      res.status(401).json({ error: error.message, code: 'DRIVE_REAUTH_REQUIRED' });
      return;
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[drive] Token refresh error: ${message}`);
    res.status(500).json({ error: 'Unable to refresh Google Drive access token.' });
  }
});

/**
 * GET /api/drive/status
 *
 * Returns the user's current Drive connection status. Does not expose tokens.
 * Used to recognize an already-connected user across devices without a sync step.
 */
router.get('/status', async (req, res) => {
  try {
    const uid = req.user!.uid;
    const record = await getDriveTokenRecord(uid);
    const info = getDriveTokenPublicInfo(record);

    if (!info) {
      res.json({ connected: false, driveEmail: null });
      return;
    }

    // Verify the token is usable; refresh if needed.
    const { accessToken, refreshed } = await getUsableAccessToken(uid);
    res.json({ connected: true, driveEmail: info.driveEmail, refreshed });
    void accessToken; // token only used to verify connectivity
  } catch (error) {
    if (error instanceof DriveConnectionError || error instanceof DriveReauthRequiredError) {
      res.json({ connected: false, driveEmail: null, reason: 'reauth_required' });
      return;
    }
    if (error instanceof TokenRevokedError) {
      res.json({ connected: false, driveEmail: null, reason: 'revoked' });
      return;
    }
    console.error(`[drive] Status check error:`, error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Unable to check Drive connection status.' });
  }
});

/**
 * GET /api/drive/storage
 *
 * Returns the user's real Google Drive storage quota via the Drive about API.
 * Uses cached values where available to reduce round-trips.
 */
router.get('/storage', requireVerifiedEmail, async (req, res) => {
  try {
    const uid = req.user!.uid;
    const quota: DriveStorageQuota = await getStorageQuota(uid);
    res.json({
      storage: {
        limit: quota.limit,
        usage: quota.usage,
        usageInDrive: quota.usageInDrive,
        usageInDriveTrash: quota.usageInDriveTrash,
        remaining: quota.remaining,
        usagePercentage: quota.usagePercentage,
        unlimited: quota.limit <= 0,
      },
    });
  } catch (error) {
    if (error instanceof DriveReauthRequiredError || error instanceof TokenRevokedError) {
      res.status(401).json({ error: error.message, code: 'DRIVE_REAUTH_REQUIRED' });
      return;
    }
    if (error instanceof DriveConnectionError) {
      res.status(404).json({ error: error.message });
      return;
    }
    console.error(`[drive] Storage error:`, error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Unable to fetch Google Drive storage.' });
  }
});

/**
 * GET /api/drive/analytics
 *
 * Returns aggregate analytics computed from the user's Drive file metadata:
 * file counts, folders, MIME distribution, sizes, largest files, recent files.
 * Uses the Drive `files` list with pagination and fields filtering. Never
 * downloads document contents.
 */
router.get('/analytics', requireVerifiedEmail, async (req, res) => {
  try {
    const uid = req.user!.uid;
    const analytics: DriveAnalytics = await getDriveAnalytics(uid);
    res.json({ analytics });
  } catch (error) {
    if (error instanceof DriveReauthRequiredError || error instanceof TokenRevokedError) {
      res.status(401).json({ error: error.message, code: 'DRIVE_REAUTH_REQUIRED' });
      return;
    }
    if (error instanceof DriveConnectionError) {
      res.status(404).json({ error: error.message });
      return;
    }
    console.error(`[drive] Analytics error:`, error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Unable to fetch Drive analytics.' });
  }
});

/**
 * GET /api/drive/recent?limit=10
 *
 * Returns the user's most recently modified Drive files (metadata only).
 */
router.get('/recent', requireVerifiedEmail, async (req, res) => {
  try {
    const uid = req.user!.uid;
    const limitRaw = req.query.limit;
    const limit = typeof limitRaw === 'string' && /^\d+$/.test(limitRaw)
      ? Math.min(50, parseInt(limitRaw, 10))
      : 10;
    const files: DriveFileMetadata[] = await getRecentDriveFiles(uid, limit);
    res.json({ files });
  } catch (error) {
    if (error instanceof DriveReauthRequiredError || error instanceof TokenRevokedError) {
      res.status(401).json({ error: error.message, code: 'DRIVE_REAUTH_REQUIRED' });
      return;
    }
    if (error instanceof DriveConnectionError) {
      res.status(404).json({ error: error.message });
      return;
    }
    console.error(`[drive] Recent error:`, error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Unable to fetch recent Drive files.' });
  }
});

/**
 * GET /api/drive/search?q=...&mimeType=...&limit=...
 *
 * Targeted metadata search across the user's Drive. Used by AI/RAG and callers
 * needing metadata-only results.
 */
router.get('/search', requireVerifiedEmail, async (req, res) => {
  try {
    const uid = req.user!.uid;
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const mimeType = typeof req.query.mimeType === 'string' ? req.query.mimeType : undefined;
    const limitRaw = req.query.limit;
    const limit = typeof limitRaw === 'string' && /^\d+$/.test(limitRaw)
      ? Math.min(50, parseInt(limitRaw, 10))
      : 10;

    const files = await searchDriveFiles(uid, { query: q, mimeType, limit });
    res.json({ files });
  } catch (error) {
    if (error instanceof DriveReauthRequiredError || error instanceof TokenRevokedError) {
      res.status(401).json({ error: error.message, code: 'DRIVE_REAUTH_REQUIRED' });
      return;
    }
    if (error instanceof DriveConnectionError) {
      res.status(404).json({ error: error.message });
      return;
    }
    console.error(`[drive] Search error:`, error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Unable to search Drive files.' });
  }
});

/**
 * GET /api/drive/activity?limit=20
 *
 * Returns recent Google Drive activity (creates, edits, renames, moves,
 * deletes, restores, shares) via the Drive Activity API v2. Normalized into a
 * small frontend-friendly response.
 */
router.get('/activity', requireVerifiedEmail, async (req, res) => {
  try {
    const uid = req.user!.uid;
    const limitRaw = req.query.limit;
    const limit = typeof limitRaw === 'string' && /^\d+$/.test(limitRaw)
      ? Math.min(50, parseInt(limitRaw, 10))
      : 20;

    const { items, nextPageToken } = await getDriveActivity(uid, { limit });
    res.json({ activities: items, nextPageToken });
  } catch (error) {
    if (error instanceof DriveReauthRequiredError || error instanceof TokenRevokedError) {
      res.status(401).json({ error: error.message, code: 'DRIVE_REAUTH_REQUIRED' });
      return;
    }
    if (error instanceof DriveConnectionError) {
      res.status(404).json({ error: error.message });
      return;
    }
    console.error(`[drive] Activity error:`, error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Unable to fetch Drive activity.' });
  }
});

/**
 * POST /api/drive/disconnect
 *
 * Explicitly disconnects a user's Drive connection (deletes both the
 * frontend-visible token and the server-only credential store) and invalidates
 * any cached Drive data for the user.
 */
router.post('/disconnect', async (req, res) => {
  try {
    const uid = req.user!.uid;
    await deleteDriveTokenRecord(uid);
    notifyDriveDisconnected(uid);
    res.json({ disconnected: true });
  } catch (error) {
    console.error(`[drive] Disconnect error:`, error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Unable to disconnect Google Drive.' });
  }
});

export default router;
