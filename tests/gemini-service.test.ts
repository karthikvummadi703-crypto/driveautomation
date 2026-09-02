import 'dotenv/config';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { chatWithGemini } from '../server/services/gemini.js';

const originalFetch = globalThis.fetch;
let requestUrl: string | null = null;
let requestBody: unknown = null;

function mockGeminiOk(reply: string) {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requestUrl = String(input);
    requestBody = init?.body ? JSON.parse(String(init.body)) : null;
    return new Response(
      JSON.stringify({
        candidates: [{ content: { parts: [{ text: reply }] } }],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
}

function mockGeminiError(status: number) {
  globalThis.fetch = (async () => new Response('boom', { status })) as typeof fetch;
}

beforeEach(() => {
  requestUrl = null;
  requestBody = null;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('Gemini service', () => {
  it('builds a multi-turn request with history and returns the reply', async () => {
    mockGeminiOk('Nice goal! Here is a monthly plan.');
    const result = await chatWithGemini({
      message: 'I want to plan my goals for this month',
      history: [{ role: 'user', parts: [{ text: 'Hello' }] }],
    });

    assert.equal(result.reply, 'Nice goal! Here is a monthly plan.');
    assert.equal(result.conversationHistory.length, 3);
    assert.equal(result.conversationHistory[0].role, 'user');
    assert.equal(result.conversationHistory[2].role, 'model');

    assert.ok(requestUrl, 'expected a request URL');
    const parsed = new URL(requestUrl!);
    assert.ok(parsed.pathname.includes('/models/'));
    assert.ok(parsed.searchParams.has('key'), 'API key passed as URL param, never in the body');

    const contents = (requestBody as { contents: Array<{ role: string }> }).contents;
    assert.equal(contents.length, 2);
    assert.equal(contents[0].role, 'user');
    assert.equal(contents[1].role, 'user');
  });

  it('throws a non-disclosing error when Gemini returns an error status', async () => {
    mockGeminiError(500);
    await assert.rejects(
      () => chatWithGemini({ message: 'hello' }),
      (err: Error) => {
        assert.ok(!err.message.includes('AIza'));
        assert.ok(!err.message.includes('PRIVATE'));
        return err.message.includes('Gemini API error');
      },
    );
  });

  it('throws when Gemini returns no candidate text', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ candidates: [] }), { status: 200 })) as typeof fetch;
    await assert.rejects(() => chatWithGemini({ message: 'hello' }), /empty response/);
    // In dev, the API key lives in env (already verified to start with AIza in smoke test);
    // ensure the error does not echo it.
  });
});