import axios from 'axios';
import { getDriveTokenRecord, saveDriveTokenRecord } from './driveTokenService.js';
import { exchangeRefreshToken } from './driveTokenExchange.js';
import { driveCache, driveCacheKey, CACHE_TTL, invalidateUserDriveCache } from './cacheService.js';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';

export interface DriveStorageQuota {
  limit: number;
  usage: number;
  usageInDrive: number;
  usageInDriveTrash: number;
  remaining: number;
  usagePercentage: number;
}

export interface DriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  createdTime?: string;
  size?: number;
  trashed?: boolean;
}

export interface DriveAnalytics {
  totalFiles: number;
  totalFolders: number;
  totalSize: number;
  byMimeType: Record<string, number>;
  byType: Record<string, { count: number; totalSize: number }>;
  largestFiles: DriveFileMetadata[];
  recentFiles: DriveFileMetadata[];
  folders: DriveFileMetadata[];
}

const MIN_REFRESH_MARGIN_MS = 5 * 60 * 1000;

/**
 * Get a usable (and if necessary freshly refreshed) Google Drive access token
 * for the given user. Validates expiry before returning.
 */
export async function getUsableAccessToken(uid: string): Promise<{ accessToken: string; refreshed: boolean }> {
  const record = await getDriveTokenRecord(uid);
  if (!record || !record.accessToken) {
    throw new DriveConnectionError('No Drive connection found. Please connect Google Drive.');
  }

  const now = Date.now();

  if (record.refreshToken && record.expiresAt && record.expiresAt <= now + MIN_REFRESH_MARGIN_MS) {
    try {
      const { accessToken, expiresIn } = await exchangeRefreshToken(record.refreshToken);
      const expiresAt = now + expiresIn * 1000;
      await saveDriveTokenRecord(uid, {
        accessToken,
        refreshToken: record.refreshToken,
        expiresAt,
        grantedAt: record.grantedAt,
        driveEmail: record.driveEmail ?? null,
      });
      return { accessToken, refreshed: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      // If refresh token is rejected (401/400), it's revoked — surface reauth state.
      if (/invalid_grant|revoked|reauthorization|deleted_client|invalid_client/i.test(message)) {
        throw new DriveReauthRequiredError(
          'This Drive connection has been revoked. Please reconnect Google Drive.',
        );
      }
      throw err;
    }
  }

  if (!record.expiresAt || record.expiresAt <= now) {
    throw new DriveReauthRequiredError(
      'This Drive connection has expired and cannot be refreshed. Please reconnect Google Drive.',
    );
  }

  return { accessToken: record.accessToken, refreshed: false };
}

/**
 * Internal raw call to the Drive API about endpoint.
 */
async function rawGetStorageQuota(accessToken: string): Promise<DriveStorageQuota> {
  const { data } = await axios.get<{
    storageQuota?: {
      limit?: string;
      usage?: string;
      usageInDrive?: string;
      usageInDriveTrash?: string;
    };
  }>(`${DRIVE_API_BASE}/about`, {
    params: { fields: 'storageQuota(limit,usage,usageInDrive,usageInDriveTrash)' },
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 5_000,
  });

  if (!data.storageQuota) {
    throw new Error('Google Drive did not return storage information.');
  }

  const limit = Number(data.storageQuota.limit || 0);
  const usage = Number(data.storageQuota.usage || 0);
  const usageInDrive = Number(data.storageQuota.usageInDrive || 0);
  const usageInDriveTrash = Number(data.storageQuota.usageInDriveTrash || 0);

  return {
    limit,
    usage,
    usageInDrive,
    usageInDriveTrash,
    remaining: limit > 0 ? Math.max(0, limit - usage) : -1,
    usagePercentage: limit > 0 ? Math.round((usage / limit) * 1000) / 10 : 0,
  };
}

export async function getStorageQuota(uid: string): Promise<DriveStorageQuota> {
  const cacheKey = driveCacheKey(uid, 'storage');
  const cached = driveCache.get<DriveStorageQuota>(cacheKey);
  if (cached) return cached;

  const { accessToken } = await getUsableAccessToken(uid);
  const quota = await rawGetStorageQuota(accessToken);
  driveCache.set(cacheKey, quota, CACHE_TTL.STORAGE);
  return quota;
}

interface DriveFilesResponse {
  files?: Array<{
    id: string;
    name: string;
    mimeType: string;
    modifiedTime?: string;
    createdTime?: string;
    size?: string;
    trashed?: boolean;
  }>;
  nextPageToken?: string;
}

async function listFilesPaginated(
  accessToken: string,
  opts: {
    q?: string;
    pageSize?: number;
    fields?: string;
    orderBy?: string;
    maxPages?: number;
  } = {},
): Promise<DriveFileMetadata[]> {
  const results: DriveFileMetadata[] = [];
  let pageToken: string | undefined;

  const pageSize = opts.pageSize ?? 50;
  const maxPages = opts.maxPages ?? 10;
  const fields = opts.fields ?? 'files(id,name,mimeType,modifiedTime,createdTime,size,trashed),nextPageToken';

  for (let page = 0; page < maxPages; page++) {
    const params: Record<string, string | number> = {
      pageSize,
      fields,
      ...(opts.q ? { q: opts.q } : {}),
      ...(opts.orderBy ? { orderBy: opts.orderBy } : {}),
    };
    if (pageToken) params.pageToken = pageToken;

    const { data } = await axios.get<DriveFilesResponse>(`${DRIVE_API_BASE}/files`, {
      params,
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 7_000,
    });

    if (data.files) {
      results.push(
        ...data.files.map((f) => ({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          modifiedTime: f.modifiedTime,
          createdTime: f.createdTime,
          size: f.size != null ? Number(f.size) : undefined,
          trashed: f.trashed,
        })),
      );
    }

    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  return results;
}

function categorizeMimeType(mimeType: string): string {
  if (mimeType === 'application/vnd.google-apps.folder') return 'folder';
  if (mimeType === 'application/vnd.google-apps.document') return 'document';
  if (mimeType === 'application/vnd.google-apps.spreadsheet') return 'spreadsheet';
  if (mimeType === 'application/vnd.google-apps.presentation') return 'presentation';
  if (mimeType === 'application/vnd.google-apps.drawing') return 'drawing';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('text/')) return 'text';
  if (mimeType.includes('zip') || mimeType.includes('compressed') || mimeType.includes('archive')) return 'archive';
  if (mimeType.includes('json') || mimeType.includes('xml') || mimeType.includes('html')) return 'code';
  return 'other';
}

export async function getDriveAnalytics(uid: string): Promise<DriveAnalytics> {
  const cacheKey = driveCacheKey(uid, 'analytics');
  const cached = driveCache.get<DriveAnalytics>(cacheKey);
  if (cached) return cached;

  const { accessToken } = await getUsableAccessToken(uid);

  const allFiles = await listFilesPaginated(accessToken, {
    q: 'trashed = false',
    pageSize: 100,
    orderBy: 'modifiedTime desc',
    maxPages: 8,
  });

  const files = allFiles.filter((f) => f.mimeType !== 'application/vnd.google-apps.folder');
  const folders = allFiles.filter((f) => f.mimeType === 'application/vnd.google-apps.folder');

  const byMimeType: Record<string, number> = {};
  const byType: Record<string, { count: number; totalSize: number }> = {};
  let totalSize = 0;

  for (const file of files) {
    byMimeType[file.mimeType] = (byMimeType[file.mimeType] || 0) + 1;
    const category = categorizeMimeType(file.mimeType);
    if (!byType[category]) byType[category] = { count: 0, totalSize: 0 };
    byType[category].count += 1;
    const size = file.size ?? 0;
    byType[category].totalSize += size;
    totalSize += size;
  }

  const sortedBySize = [...files].sort((a, b) => (b.size ?? 0) - (a.size ?? 0));
  const sortedByTime = files;

  const analytics: DriveAnalytics = {
    totalFiles: files.length,
    totalFolders: folders.length,
    totalSize,
    byMimeType,
    byType,
    largestFiles: sortedBySize.slice(0, 10),
    recentFiles: sortedByTime.slice(0, 10),
    folders: folders.slice(0, 20),
  };

  driveCache.set(cacheKey, analytics, CACHE_TTL.ANALYTICS);
  return analytics;
}

export async function getRecentDriveFiles(uid: string, limit = 10): Promise<DriveFileMetadata[]> {
  const cacheKey = driveCacheKey(uid, 'recent');
  const cached = driveCache.get<DriveFileMetadata[]>(cacheKey);
  if (cached) return cached.slice(0, limit);

  const { accessToken } = await getUsableAccessToken(uid);
  const recent = await listFilesPaginated(accessToken, {
    q: 'trashed = false',
    pageSize: limit,
    orderBy: 'modifiedTime desc',
    maxPages: 1,
  });

  driveCache.set(cacheKey, recent, CACHE_TTL.RECENT);
  return recent.slice(0, limit);
}

/**
 * Search Drive by query. Used by AI/RAG for targeted retrieval.
 * Never downloads content here — metadata-only.
 */
export async function searchDriveFiles(
  uid: string,
  opts: {
    query?: string;
    mimeType?: string;
    limit?: number;
    orderBy?: string;
  } = {},
): Promise<DriveFileMetadata[]> {
  const { accessToken } = await getUsableAccessToken(uid);

  const clauses: string[] = ['trashed = false'];
  if (opts.query) {
    const escaped = opts.query.replace(/'/g, "\\'");
    clauses.push(`name contains '${escaped}'`);
  }
  if (opts.mimeType) {
    clauses.push(`mimeType = '${opts.mimeType.replace(/'/g, "\\'")}'`);
  }

  return listFilesPaginated(accessToken, {
    q: clauses.join(' and '),
    pageSize: opts.limit ?? 10,
    orderBy: opts.orderBy ?? 'modifiedTime desc',
    maxPages: 1,
  });
}

export function notifyDriveDisconnected(uid: string): void {
  invalidateUserDriveCache(uid);
}

export class DriveConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DriveConnectionError';
  }
}

export class DriveReauthRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DriveReauthRequiredError';
  }
}
