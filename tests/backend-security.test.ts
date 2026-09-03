import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { app } from '../server/index.js';

let server: Server;
let baseUrl: string;

before(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Failed to bind test server');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

async function request(
  path: string,
  options: { method?: string; headers?: Record<string, string>; body?: unknown } = {},
) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

describe('Backend security tests', () => {
  it('health endpoint is publicly reachable', async () => {
    const { status, data } = await request('/api/health');
    assert.equal(status, 200);
    assert.equal((data as { status: string }).status, 'ok');
  });

  it('unknown route returns 404 JSON', async () => {
    const { status, data } = await request('/api/does-not-exist');
    assert.equal(status, 404);
    assert.ok((data as { error?: string }).error);
  });

  it('Test 4: POST /api/chat with no Authorization -> 401', async () => {
    const { status, data } = await request('/api/chat', { method: 'POST' });
    assert.equal(status, 401);
    assert.equal((data as { error?: string }).error, 'Unauthorized');
  });

  it('Test 5: POST /api/chat with invalid token -> 401 (not 200)', async () => {
    const { status, data } = await request('/api/chat', {
      method: 'POST',
      headers: { Authorization: 'Bearer this-is-not-a-valid-firebase-token' },
    });
    assert.equal(status, 401);
    assert.equal((data as { error?: string }).error, 'Unauthorized');
  });

  it('empty Bearer token -> 401', async () => {
    const { status } = await request('/api/chat', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' },
    });
    assert.equal(status, 401);
  });

  it('non-Bearer Authorization header -> 401', async () => {
    const { status } = await request('/api/chat', {
      method: 'POST',
      headers: { Authorization: 'Basic abc123' },
    });
    assert.equal(status, 401);
  });

  it('POST /api/journal with no token -> 401', async () => {
    const { status } = await request('/api/journal', { method: 'POST', body: { title: 'x', content: 'y' } });
    assert.equal(status, 401);
  });

  it('GET /api/journal with no token -> 401', async () => {
    const { status } = await request('/api/journal');
    assert.equal(status, 401);
  });

  it('POST /api/auth/verify with no token -> 401', async () => {
    const { status } = await request('/api/auth/verify', { method: 'POST' });
    assert.equal(status, 401);
  });

  it('journal export endpoint with no token -> 401', async () => {
    const { status } = await request('/api/journal/anything/export', { method: 'POST' });
    assert.equal(status, 401);
  });

  it('summarize endpoint with no token -> 401', async () => {
    const { status } = await request('/api/journal/anything/summarize', { method: 'POST' });
    assert.equal(status, 401);
  });

  it('chat response never leaks secrets even when token is invalid', async () => {
    const { status, data } = await request('/api/chat', {
      method: 'POST',
      headers: { Authorization: 'Bearer invalid' },
      body: { message: 'hi', conversationId: 'x' },
    });
    assert.equal(status, 401);
    const body = JSON.stringify(data);
    assert.ok(!body.includes('AIza'));
    assert.ok(!body.includes('PRIVATE KEY'));
    assert.ok(!body.includes('Bearer'));
  });

  it('POST /api/drive/token with no token -> 401', async () => {
    const { status } = await request('/api/drive/token', { method: 'POST' });
    assert.equal(status, 401);
  });

  it('client-supplied uid in the body cannot bypass auth', async () => {
    const { status, data } = await request('/api/chat', {
      method: 'POST',
      body: { message: 'hi', uid: 'someone-else' },
    });
    assert.equal(status, 401);
    assert.equal((data as { error?: string }).error, 'Unauthorized');
  });

  it('client-supplied email in the body cannot bypass auth', async () => {
    const { status, data } = await request('/api/journal', {
      method: 'POST',
      body: { title: 't', content: 'c', email: 'fake@example.com', uid: 'attacker' },
    });
    assert.equal(status, 401);
    assert.equal((data as { error?: string }).error, 'Unauthorized');
  });

  it('journal entry operations ignore client-supplied uid/email', async () => {
    // Even with a syntactically invalid token, auth runs first and the body
    // identity fields must never be honored to reach the document layer.
    const { status } = await request('/api/journal/any-id/export', {
      method: 'POST',
      headers: { Authorization: 'Bearer invalid' },
      body: { email: 'victim@example.com', uid: 'victim-uid' },
    });
    assert.equal(status, 401);
  });

  it('GET /api/drive/oauth/start requires a valid Firebase ID token', async () => {
    const { status } = await request('/api/drive/oauth/start');
    assert.equal(status, 401);
    const invalid = await request('/api/drive/oauth/start', {
      headers: { Authorization: 'Bearer not-a-real-token' },
    });
    assert.equal(invalid.status, 401);
  });

  it('GET /api/drive/oauth/callback is publicly reachable (no auth) and rejects bad state via redirect', async () => {
    // The OAuth callback is reached by a browser redirect from Google, so it
    // must not require (or return) 401. With an invalid/missing state it should
    // redirect to the frontend error page, not error out or leak data.
    const res = await fetch(`${baseUrl}/api/drive/oauth/callback?code=abc&state=forged-state`, {
      redirect: 'manual',
    });
    assert.equal(res.status, 302);
    const location = res.headers.get('location') ?? '';
    assert.ok(location.includes('connect-drive'));
    assert.ok(location.includes('error'));
  });

  it('GET /api/drive/oauth/callback redirects on Google-reported error', async () => {
    const res = await fetch(
      `${baseUrl}/api/drive/oauth/callback?error=access_denied`,
      { redirect: 'manual' },
    );
    assert.equal(res.status, 302);
    const location = res.headers.get('location') ?? '';
    assert.ok(location.includes('status=error'));
  });
});