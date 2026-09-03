import type { SecretManagerServiceClient } from '@google-cloud/secret-manager';

let secretClient: SecretManagerServiceClient | null = null;
const secretCache = new Map<string, string>();

async function getClient(): Promise<SecretManagerServiceClient> {
  if (secretClient) return secretClient;
  const { SecretManagerServiceClient } = await import('@google-cloud/secret-manager');
  secretClient = new SecretManagerServiceClient();
  return secretClient;
}

/**
 * Collect all configured Gemini API keys, in priority order, so callers can
 * rotate automatically when one hits its rate limit or becomes invalid.
 * Supported sources (first match wins, in order):
 *   1. GEMINI_API_KEYS          - comma-separated list
 *   2. DEV_GEMINI_API_KEY       - primary dev key
 *   3. GEMINI_API_KEY           - generic fallback
 *   4. GEMINI_KEY_2, GEMINI_KEY_3, ...  - additional numbered keys
 */
export function getGeminiApiKeys(): string[] {
  const keys: string[] = [];

  const commaKeys = process.env.GEMINI_API_KEYS;
  if (commaKeys) {
    for (const k of commaKeys.split(',').map((s) => s.trim())) {
      if (k) keys.push(k);
    }
  }

  const primary = process.env.DEV_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (primary) keys.push(primary);

  for (let i = 2; ; i++) {
    const k = process.env[`GEMINI_KEY_${i}`];
    if (k) keys.push(k);
    else break;
  }

  return keys;
}

export async function getSecret(secretName: string): Promise<string> {
  const cached = secretCache.get(secretName);
  if (cached) return cached;

  // Development-only fallback: resolve from environment variables first so that
  // local runs don't depend on Google Cloud Secret Manager. This branch is
  // skipped entirely in production, where Secret Manager is the only source.
  if (process.env.NODE_ENV !== 'production') {
    const fallback =
      process.env[`DEV_${secretName}`] ||
      process.env.DEV_GEMINI_API_KEY ||
      process.env.GEMINI_API_KEY;
    if (fallback) {
      console.warn(
        `[secretManager] Using development fallback environment variable for secret "${secretName}". ` +
        `This MUST NOT be used in production. Use Google Cloud Secret Manager instead.`,
      );
      return fallback;
    }
  }

  try {
    const client = await getClient();
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
    if (!projectId) {
      throw new Error('GOOGLE_CLOUD_PROJECT is not set');
    }
    const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;

    const [accessResponse] = await client.accessSecretVersion({ name });
    const secret = accessResponse.payload?.data?.toString();

    if (!secret) {
      throw new Error(`Secret "${secretName}" has no data`);
    }

    secretCache.set(secretName, secret);
    return secret;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    throw new Error(
      `Failed to retrieve secret "${secretName}" from Secret Manager: ${message}. ` +
      `In development, set DEV_GEMINI_API_KEY (or GEMINI_API_KEY) as an environment variable.`,
    );
  }
}
