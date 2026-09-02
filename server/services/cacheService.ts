interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Lightweight per-user in-memory cache with short TTLs.
 * Keys are scoped by uid so cached data is never shared between users.
 */
class UserScopedCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set(key: string, value: unknown, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  deleteByPrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  clear(): void {
    this.store.clear();
  }
}

export const driveCache = new UserScopedCache();

export function driveCacheKey(uid: string, suffix: string): string {
  return `drive:${uid}:${suffix}`;
}

export const CACHE_TTL = {
  STORAGE: 30_000,
  ANALYTICS: 60_000,
  RECENT: 30_000,
  ACTIVITY: 60_000,
} as const;

export function invalidateUserDriveCache(uid: string): void {
  driveCache.deleteByPrefix(`drive:${uid}:`);
}
