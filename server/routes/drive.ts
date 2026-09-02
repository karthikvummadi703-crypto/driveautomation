import { Router } from 'express';
import { authenticateFirebaseUser, requireVerifiedEmail } from '../middleware/auth.js';
import {
  getDriveTokenRecord,
  saveDriveTokenRecord,
  deleteDriveTokenRecord,
  getDriveTokenPublicInfo,
} from '../services/driveTokenService.js';
import { exchangeRefreshToken, TokenRevokedError } from '../services/driveTokenExchange.js';
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
router.use(authenticateFirebaseUser);
router.use(requireVerifiedEmail);

const MIN_REFRESH_MARGIN_MS = 5 * 60 * 1000;

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
router.get('/storage', async (req, res) => {
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
router.get('/analytics', async (req, res) => {
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
router.get('/recent', async (req, res) => {
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
router.get('/search', async (req, res) => {
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
router.get('/activity', async (req, res) => {
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
