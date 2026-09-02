import type { SecretManagerServiceClient } from '@google-cloud/secret-manager';

let secretClient: SecretManagerServiceClient | null = null;
const secretCache = new Map<string, string>();

async function getClient(): Promise<SecretManagerServiceClient> {
  if (secretClient) return secretClient;
  const { SecretManagerServiceClient } = await import('@google-cloud/secret-manager');
  secretClient = new SecretManagerServiceClient();
  return secretClient;
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
