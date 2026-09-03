import dns from 'node:dns';
import { getGeminiApiKeys } from './secretManager.js';

// Enforce IPv4 DNS resolution for fast Google API connectivity on Windows
dns.setDefaultResultOrder('ipv4first');

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// Automatic key rotation: remember which key index is currently in use and
// advance to the next key when the current one hits a rate limit (429) or is
// rejected as invalid (401 / 400 "API key"). Round-robins across all keys.
let apiKeys: string[] | null = null;
let currentKeyIndex = 0;

function getKeyList(): string[] {
  if (apiKeys) return apiKeys;
  apiKeys = getGeminiApiKeys();
  return apiKeys;
}

function getActiveApiKey(): string {
  const keys = getKeyList();
  if (keys.length === 0) {
    throw new Error(
      'No Gemini API key configured. Set DEV_GEMINI_API_KEY in your environment variables.',
    );
  }
  return keys[currentKeyIndex % keys.length];
}

function nextKey(): void {
  const count = getKeyList().length;
  if (count > 0) {
    currentKeyIndex = (currentKeyIndex + 1) % count;
  }
}

// Returns true when the Gemini API indicates the key itself is the problem,
// so the caller should rotate to the next key and retry.
function shouldRotateForStatus(status: number, body: string): boolean {
  if (status === 429) return true;
  if (status === 401) return true;
  if (status === 400 && /API[ _-]?key|apiKey|API_KEY/i.test(body)) return true;
  if (status === 403 && /[Rr]ate[ -]?[Ll]imit/i.test(body)) return true;
  return false;
}

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface GeminiChatRequest {
  message: string;
  history?: GeminiMessage[];
  systemInstruction?: string;
}

export interface GeminiChatResponse {
  reply: string;
  conversationHistory: GeminiMessage[];
}

export async function chatWithGemini(request: GeminiChatRequest): Promise<GeminiChatResponse> {
  const contents: GeminiMessage[] = [];

  if (request.history && request.history.length > 0) {
    for (const msg of request.history) {
      contents.push(msg);
    }
  }

  contents.push({
    role: 'user',
    parts: [{ text: request.message }],
  });

  const requestBody: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
    },
  };

  if (request.systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: request.systemInstruction }],
    };
  }

  let model = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
  // Guard against deprecated/removed model names. As of 2026, gemini-2.x and
  // gemini-1.5-flash are no longer served by the generative language API.
  if (model.includes('1.5') || model.includes('2.0') || model.includes('2.5') || model.includes('3.5')) {
    model = 'gemini-3-flash-preview';
  }

  const keyCount = getKeyList().length;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < keyCount; attempt++) {
    const apiKey = getActiveApiKey();
    const isOauthToken = apiKey.startsWith('ya29.');
    const makeUrl = (targetModel: string) =>
      isOauthToken
        ? `${GEMINI_API_URL}/${targetModel}:generateContent`
        : `${GEMINI_API_URL}/${targetModel}:generateContent?key=${apiKey}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (isOauthToken) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const start = Date.now();
    let response = await fetch(makeUrl(model), {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(30_000),
    });

    // Fallback to gemini-3-flash-preview if the configured model is 404/unsupported
    if (response.status === 404 && model !== 'gemini-3-flash-preview' && model !== 'gemini-flash-lite-latest') {
      console.warn(`[gemini] Model ${model} returned 404. Falling back to gemini-3-flash-preview...`);
      model = 'gemini-3-flash-preview';
      response = await fetch(makeUrl(model), {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(30_000),
      });
    }

    const latencyMs = Date.now() - start;
    console.log(`[gemini] request completed in ${latencyMs}ms (model: ${model}, key #${currentKeyIndex + 1}, status ${response.status})`);

    if (response.ok) {
      const data = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
            role?: string;
          };
        }>;
      };

      const candidate = data.candidates?.[0];
      const replyText = candidate?.content?.parts?.[0]?.text;

      if (!replyText) {
        throw new Error('Gemini returned an empty response');
      }

      const updatedHistory: GeminiMessage[] = [
        ...contents,
        {
          role: 'model',
          parts: [{ text: replyText }],
        },
      ];

      return {
        reply: replyText,
        conversationHistory: updatedHistory,
      };
    }

    const errorBody = await response.text();
    console.error(`[gemini] API error ${response.status}: ${errorBody}`);

    if (shouldRotateForStatus(response.status, errorBody)) {
      nextKey();
      console.warn(`[gemini] Key #${((currentKeyIndex + keyCount - 1) % keyCount) + 1} failed (${response.status}), rotating to key #${currentKeyIndex + 1} and retrying...`);
      lastError = new Error(`Gemini API error (${response.status})`);
      continue;
    }

    let userMessage = `Gemini API error (${response.status})`;
    try {
      const parsedErr = JSON.parse(errorBody) as { error?: { message?: string; status?: string } };
      if (parsedErr.error?.message) {
        userMessage = parsedErr.error.message;
      }
    } catch {
      // Keep default message if not JSON
    }

    if (response.status === 403 && userMessage.includes('disabled')) {
      userMessage =
        'The Gemini API is not enabled on your Google Cloud Project (984526389105).\n\n' +
        '👉 Please click this link to enable it in 1 click:\n' +
        'https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview?project=984526389105\n\n' +
        'Or get a free API key from Google AI Studio: https://aistudio.google.com/app/apikey';
    } else if (response.status === 401 || response.status === 400 && userMessage.includes('API key')) {
      userMessage =
        'Invalid Gemini API key. Please check your DEV_GEMINI_API_KEY in .env or get a free key from https://aistudio.google.com/app/apikey';
    }

    throw new Error(userMessage);
  }

  throw lastError ?? new Error('Gemini request failed after exhausting all API keys');
}

export interface GeminiStreamRequest {
  message: string;
  history?: GeminiMessage[];
  systemInstruction?: string;
}

/**
 * Stream a Gemini response token-by-token using the streaming generate API
 * (streamGenerateContent?alt=sse). Yields progressive text chunks so the
 * frontend can render the answer as it arrives, dramatically improving
 * perceived latency over waiting for the full generation.
 */
export async function* streamChatWithGemini(
  request: GeminiStreamRequest,
): AsyncGenerator<string, void, unknown> {
  const contents: GeminiMessage[] = [];
  if (request.history && request.history.length > 0) {
    for (const msg of request.history) {
      contents.push(msg);
    }
  }
  contents.push({
    role: 'user',
    parts: [{ text: request.message }],
  });

  const requestBody: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
    },
  };

  if (request.systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: request.systemInstruction }],
    };
  }

  let model = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
  // Guard against deprecated/removed model names.
  if (model.includes('1.5') || model.includes('2.0') || model.includes('2.5') || model.includes('3.5')) {
    model = 'gemini-3-flash-preview';
  }

  const keyCount = getKeyList().length;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < keyCount; attempt++) {
    const apiKey = getActiveApiKey();
    const isOauthToken = apiKey.startsWith('ya29.');
    const makeUrl = (targetModel: string) =>
      isOauthToken
        ? `${GEMINI_API_URL}/${targetModel}:streamGenerateContent?alt=sse`
        : `${GEMINI_API_URL}/${targetModel}:streamGenerateContent?alt=sse&key=${apiKey}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (isOauthToken) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    let response = await fetch(makeUrl(model), {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(60_000),
    });

    if (response.status === 404 && model !== 'gemini-3-flash-preview' && model !== 'gemini-flash-lite-latest') {
      console.warn(`[gemini] Model ${model} returned 404. Falling back to gemini-3-flash-preview...`);
      model = 'gemini-3-flash-preview';
      response = await fetch(makeUrl(model), {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(60_000),
      });
    }

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[gemini] stream API error ${response.status}: ${errorBody}`);

      if (shouldRotateForStatus(response.status, errorBody)) {
        const failedKeyNum = currentKeyIndex + 1;
        nextKey();
        console.warn(`[gemini] Key #${failedKeyNum} failed (${response.status}), rotating to key #${currentKeyIndex + 1} and retrying...`);
        lastError = new Error(`Gemini API error (${response.status})`);
        continue;
      }

      let userMessage = `Gemini API error (${response.status})`;
      try {
        const parsedErr = JSON.parse(errorBody) as { error?: { message?: string; status?: string } };
        if (parsedErr.error?.message) {
          userMessage = parsedErr.error.message;
        }
      } catch {
        // keep default
      }

      if (response.status === 403 && userMessage.includes('disabled')) {
        userMessage =
          'The Gemini API is not enabled on your Google Cloud Project (984526389105).\n\n' +
          '👉 Please click this link to enable it in 1 click:\n' +
          'https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview?project=984526389105\n\n' +
          'Or get a free API key from Google AI Studio: https://aistudio.google.com/app/apikey';
      } else if (response.status === 401 || (response.status === 400 && userMessage.includes('API key'))) {
        userMessage =
          'Invalid Gemini API key. Please check your DEV_GEMINI_API_KEY in .env or get a free key from https://aistudio.google.com/app/apikey';
      }

      throw new Error(userMessage);
    }

    if (!response.body) {
      throw new Error('Gemini stream returned no body.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = '';
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          try {
            const parsed = JSON.parse(payload) as {
              candidates?: Array<{
                content?: {
                  parts?: Array<{ text?: string }>;
                };
              }>;
            };
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              yield text;
            }
          } catch {
            // ignore malformed chunk
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    return;
  }

  throw lastError ?? new Error('Gemini stream failed after exhausting all API keys');
}
