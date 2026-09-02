import 'dotenv/config';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { TokenRevokedError, exchangeRefreshToken } from '../server/services/driveTokenExchange.js';

const originalFetch = globalThis.fetch;
const originalClientId = process.env.GOOGLE_CLIENT_ID;
const originalClientSecret = process.env.GOOGLE_CLIENT_SECRET;

function mockFetch(status: number, body: unknown) {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;
}

beforeEach(() => {
  process.env.GOOGLE_CLIENT_ID = 'test-client-id';
  process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalClientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
  else process.env.GOOGLE_CLIENT_ID = originalClientId;
  if (originalClientSecret === undefined) delete process.env.GOOGLE_CLIENT_SECRET;
  else process.env.GOOGLE_CLIENT_SECRET = originalClientSecret;
});

describe('driveTokenExchange', () => {
  it('throws clear config error without client credentials', async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    await assert.rejects(
      () => exchangeRefreshToken('refresh-token'),
      /GOOGLE_CLIENT_ID/,
    );
  });

  it('returns an access token on success', async () => {
    mockFetch(200, { access_token: 'new-token', expires_in: 3600 });
    const result = await exchangeRefreshToken('refresh-token');
    assert.equal(result.accessToken, 'new-token');
    assert.equal(result.expiresIn, 3600);
  });

  it('throws TokenRevokedError on invalid_grant', async () => {
    mockFetch(400, { error: 'invalid_grant', error_description: 'Token has been revoked.' });
    await assert.rejects(
      () => exchangeRefreshToken('stale-refresh-token'),
      (err: Error) => {
        assert.ok(err instanceof TokenRevokedError);
        return err.message.includes('revoked');
      },
    );
  });

  it('throws TokenRevokedError on revoked error code', async () => {
    mockFetch(400, { error: 'revoked' });
    await assert.rejects(
      () => exchangeRefreshToken('bad-token'),
      (err: Error) => err instanceof TokenRevokedError,
    );
  });

  it('throws a generic (non-disclosing) error on server errors', async () => {
    mockFetch(500, { error: 'server_error' });
    await assert.rejects(
      () => exchangeRefreshToken('token'),
      (err: Error) => {
        assert.ok(!(err instanceof TokenRevokedError));
        return err.message.includes('unavailable');
      },
    );
  });

  it('handles rate limiting with a helpful message', async () => {
    mockFetch(429, { error: 'rate_limit_exceeded' });
    await assert.rejects(
      () => exchangeRefreshToken('token'),
      (err: Error) => err.message.includes('rate-limited'),
    );
  });

  it('does not leak refresh token in error messages', async () => {
    mockFetch(500, { error: 'error with secret-refresh-token-data' });
    await assert.rejects(
      () => exchangeRefreshToken('my-secret-refresh-token-xyz'),
      (err: Error) => {
        assert.ok(!err.message.includes('my-secret-refresh-token-xyz'));
        return true;
      },
    );
  });
});
