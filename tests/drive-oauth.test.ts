import 'dotenv/config';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { generateOAuthState, verifyOAuthState } from '../server/services/oauthState.js';
import { TokenRevokedError, exchangeAuthorizationCode } from '../server/services/driveTokenExchange.js';
import { buildDriveAuthorizationUrl, getDriveRedirectUri, DRIVE_SCOPE } from '../server/services/driveOAuth.js';

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

describe('oauthState', () => {
  it('verifies a state it generated and returns the bound uid', () => {
    const state = generateOAuthState('uid-123');
    assert.equal(verifyOAuthState(state), 'uid-123');
  });

  it('rejects a tampered state', () => {
    const state = generateOAuthState('uid-123');
    const tampered = `${state.slice(0, -4)}AAAA`;
    assert.equal(verifyOAuthState(tampered), null);
  });

  it('rejects a state with a forged uid', () => {
    const state = generateOAuthState('uid-123');
    const parts = state.split('.');
    parts[0] = 'victim-uid';
    assert.equal(verifyOAuthState(parts.join('.')), null);
  });

  it('rejects malformed / non-string state', () => {
    assert.equal(verifyOAuthState('not-a-valid-state'), null);
    assert.equal(verifyOAuthState('a.b.c'), null);
  });

  it('rejects an expired state', () => {
    const expired = generateOAuthState('uid-123', Date.now() - 11 * 60 * 1000);
    assert.equal(verifyOAuthState(expired), null);
  });
});

describe('exchangeAuthorizationCode', () => {
  it('returns access + refresh tokens on success', async () => {
    mockFetch(200, { access_token: 'acc', refresh_token: 'ref', expires_in: 3600 });
    const result = await exchangeAuthorizationCode('auth-code', 'http://localhost:3001/api/drive/oauth/callback');
    assert.equal(result.accessToken, 'acc');
    assert.equal(result.refreshToken, 'ref');
    assert.equal(result.expiresIn, 3600);
  });

  it('throws clear config error without client credentials', async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    await assert.rejects(
      () => exchangeAuthorizationCode('code', 'http://localhost:3001/oauth/cb'),
      /GOOGLE_CLIENT_ID/,
    );
  });

  it('throws TokenRevokedError on invalid_grant / expired code', async () => {
    mockFetch(400, { error: 'invalid_grant', error_description: 'Code expired.' });
    await assert.rejects(
      () => exchangeAuthorizationCode('stale-code', 'http://localhost:3001/oauth/cb'),
      (err: Error) => err instanceof TokenRevokedError,
    );
  });

  it('does not leak the code or refresh token in error messages', async () => {
    mockFetch(500, { error: 'boom secret-code-data' });
    await assert.rejects(
      () => exchangeAuthorizationCode('my-secret-auth-code-xyz', 'http://localhost:3001/oauth/cb'),
      (err: Error) => {
        assert.ok(!err.message.includes('my-secret-auth-code-xyz'));
        return true;
      },
    );
  });
});

describe('driveOAuth', () => {
  it('builds an authorization URL with code + offline access', () => {
    const url = buildDriveAuthorizationUrl('uid-123');
    const parsed = new URL(url);
    assert.equal(parsed.origin + parsed.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
    assert.equal(parsed.searchParams.get('response_type'), 'code');
    assert.equal(parsed.searchParams.get('access_type'), 'offline');
    assert.equal(parsed.searchParams.get('prompt'), 'consent');
    assert.equal(parsed.searchParams.get('client_id'), 'test-client-id');
    assert.ok(parsed.searchParams.get('state'));
    // Redirect URI must match the configured default callback.
    assert.equal(parsed.searchParams.get('redirect_uri'), getDriveRedirectUri());
    // All required scopes are requested.
    for (const scope of DRIVE_SCOPE.split(' ')) {
      assert.ok(parsed.searchParams.get('scope')!.includes(scope));
    }
  });

  it('throws if GOOGLE_CLIENT_ID is not set', () => {
    delete process.env.GOOGLE_CLIENT_ID;
    assert.throws(() => buildDriveAuthorizationUrl('uid-123'), /GOOGLE_CLIENT_ID/);
  });

  it('respects GOOGLE_REDIRECT_URI override', () => {
    const prev = process.env.GOOGLE_REDIRECT_URI;
    try {
      process.env.GOOGLE_REDIRECT_URI = 'https://api.example.com/api/drive/oauth/callback';
      const url = buildDriveAuthorizationUrl('uid-123');
      assert.equal(new URL(url).searchParams.get('redirect_uri'), 'https://api.example.com/api/drive/oauth/callback');
    } finally {
      if (prev === undefined) delete process.env.GOOGLE_REDIRECT_URI;
      else process.env.GOOGLE_REDIRECT_URI = prev;
    }
  });
});
