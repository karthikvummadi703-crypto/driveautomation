import axios from 'axios';
import { getUsableAccessToken } from './driveService.js';
import { driveCache, driveCacheKey, CACHE_TTL } from './cacheService.js';

const ACTIVITY_API_BASE = 'https://driveactivity.googleapis.com/v2';

export interface DriveActivityItem {
  id: string;
  actionType: string;
  timestamp: string;
  targetTitle: string | null;
  targetType: string | null;
  performer: string | null;
  detail: Record<string, unknown>;
}

interface RawActivityResponse {
  activities?: Array<{
    name?: string;
    primaryActionDetail?: Record<string, unknown>;
    timestamp?: string;
    timeRange?: { endTime?: string };
    actors?: Array<{
      user?: { knownUser?: { personName?: string; displayName?: string } };
      anonymous?: Record<string, unknown>;
    }>;
    targets?: Array<{
      driveItem?: {
        name?: string;
        title?: string;
        driveFile?: Record<string, unknown>;
        driveFolder?: Record<string, unknown>;
        mimeType?: string;
      };
      drive?: { name?: string; title?: string };
    }>;
  }>;
  nextPageToken?: string;
}

const ACTION_LABELS: Record<string, string> = {
  create: 'created',
  edit: 'edited',
  rename: 'renamed',
  move: 'moved',
  delete: 'deleted',
  restore: 'restored',
  permissionChange: 'shared',
  comment: 'commented',
  upload: 'uploaded',
};

function extractActionType(detail: Record<string, unknown>): string {
  if (typeof detail !== 'object' || detail === null) return 'unknown';
  const knownKeys = Object.keys(detail);
  for (const key of knownKeys) {
    if (key.endsWith('Detail')) {
      const base = key.replace('Detail', '');
      return ACTION_LABELS[base] || base;
    }
  }
  return knownKeys[0] || 'unknown';
}

function extractTargetTitle(
  targets: NonNullable<RawActivityResponse['activities']>[number]['targets'],
): {
  title: string | null;
  type: string | null;
} {
  for (const t of targets ?? []) {
    if (t.driveItem) {
      return {
        title: t.driveItem.title ?? t.driveItem.name ?? null,
        type: t.driveItem.mimeType ? 'file' : 'folder',
      };
    }
    if (t.drive) {
      return { title: t.drive.title ?? t.drive.name ?? null, type: 'drive' };
    }
  }
  return { title: null, type: null };
}

/**
 * Fetches recent Drive activity for a user via the Drive Activity API v2.
 * Requires the drive.activity.readonly OAuth scope.
 *
 * The response is normalized into a small frontend-friendly shape.
 */
export async function getDriveActivity(
  uid: string,
  opts: { limit?: number; pageSize?: number } = {},
): Promise<{ items: DriveActivityItem[]; nextPageToken: string | null }> {
  const cacheKey = driveCacheKey(uid, 'activity');
  const cached = driveCache.get<{ items: DriveActivityItem[]; nextPageToken: string | null }>(cacheKey);
  if (cached) return cached;

  const { accessToken } = await getUsableAccessToken(uid);

  const pageSize = opts.pageSize ?? 20;
  const limit = opts.limit ?? 20;

  const response = await axios.post<RawActivityResponse>(
    `${ACTIVITY_API_BASE}/activity:query`,
    {
      pageSize,
      ancestorName: 'items/root',
      consolidationStrategy: { legacy: {} },
    },
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 7_000,
    },
  );

  const activities = response.data.activities ?? [];

  const items: DriveActivityItem[] = activities.slice(0, limit).map((act) => {
    const primaryActionDetail = (act.primaryActionDetail ?? {}) as Record<string, unknown>;
    const timestamp = act.timestamp ?? act.timeRange?.endTime ?? new Date().toISOString();
    const { title, type } = extractTargetTitle(act.targets);
    const performers = (act.actors ?? [])
      .map((a) => a.user?.knownUser?.displayName ?? a.user?.knownUser?.personName ?? null)
      .filter(Boolean);

    return {
      id: act.name ?? `${act.timestamp ?? Date.now()}-${Math.random().toString(36).slice(2)}`,
      actionType: extractActionType(primaryActionDetail),
      timestamp,
      targetTitle: title,
      targetType: type,
      performer: performers.length > 0 ? performers[0] : null,
      detail: primaryActionDetail,
    };
  });

  const result = { items, nextPageToken: response.data.nextPageToken ?? null };

  // Brief cache even in failure-to-parse cases; TTL is short.
  driveCache.set(cacheKey, result, CACHE_TTL.ACTIVITY);
  return result;
}
