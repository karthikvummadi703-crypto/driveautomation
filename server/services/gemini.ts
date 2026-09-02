import dns from 'node:dns';
import { getSecret } from './secretManager.js';

// Enforce IPv4 DNS resolution for fast Google API connectivity on Windows
dns.setDefaultResultOrder('ipv4first');

const GEMINI_SECRET_NAME = process.env.GEMINI_SECRET_NAME || 'gemini-api-key';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

let cachedApiKey: string | null = null;

async function getGeminiApiKey(): Promise<string> {
  if (cachedApiKey) return cachedApiKey;
  const key = await getSecret(GEMINI_SECRET_NAME);
  cachedApiKey = key;
  return key;
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
  const apiKey = await getGeminiApiKey();

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

  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  const isOauthToken = apiKey.startsWith('ya29.');
  const url = isOauthToken
    ? `${GEMINI_API_URL}/${model}:generateContent`
    : `${GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (isOauthToken) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const start = Date.now();
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(30_000),
  });
  const latencyMs = Date.now() - start;
  console.log(`[gemini] request completed in ${latencyMs}ms (status ${response.status})`);

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[gemini] API error ${response.status}: ${errorBody}`);
    
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
    } else if (response.status === 401) {
      userMessage =
        'Invalid Gemini API key. Please check your DEV_GEMINI_API_KEY in .env or get a free key from https://aistudio.google.com/app/apikey';
    }

    throw new Error(userMessage);
  }

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
