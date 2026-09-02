import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyDriveQuery } from '../server/services/ragService.js';
import { getDriveTokenPublicInfo } from '../server/services/driveTokenService.js';
import { driveCacheKey } from '../server/services/cacheService.js';

// No network tests — these tests validate the routing/normalization logic and
// the cache-key scheme so a Drive connection is recognized across devices.

describe('Drive activity + persistent connection state', () => {
  it('classifies activity questions for the Drive Activity API path', () => {
    assert.equal(classifyDriveQuery('What happened in my Drive recently?'), 'activity');
    assert.equal(classifyDriveQuery('Show the drive log'), 'activity');
  });

  it('recognizes a valid persistent connection (token record present)', () => {
    const info = getDriveTokenPublicInfo({
      uid: 'userA',
      accessToken: 'a-token',
      refreshToken: 'a-refresh',
      expiresAt: Date.now() + 100_000,
      grantedAt: Date.now(),
      driveEmail: 'a@example.com',
    });
    assert.deepEqual(info, { connected: true, driveEmail: 'a@example.com' });
    // Never exposes the refresh token.
    assert.ok(!JSON.stringify(info).includes('a-refresh'));
  });

  it('returns disconnected when there is no token record', () => {
    assert.equal(getDriveTokenPublicInfo(null), null);
  });

  it('cache keys are user-scoped (uid prefix)', () => {
    const a = driveCacheKey('userA', 'storage');
    const b = driveCacheKey('userB', 'storage');
    assert.notEqual(a, b);
    assert.ok(a.includes('userA'));
    assert.ok(!a.includes('userB'));
    assert.ok(b.includes('userB'));
    assert.ok(!b.includes('userA'));
  });
});
