import crypto from 'node:crypto';

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || '';
const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET || '';

export interface N8nExportPayload {
  uid: string;
  journalEntryId: string;
  fileName: string;
  markdown: string;
  email: string | null;
}

export function n8nConfigured(): boolean {
  return Boolean(N8N_WEBHOOK_URL && N8N_WEBHOOK_SECRET);
}

export function n8nWebhookUrl(): string | null {
  return N8N_WEBHOOK_URL || null;
}

/**
 * Calls the n8n webhook that handles Drive automation.
 *
 * Security notes:
 * - This function is only ever invoked by the backend AFTER Firebase auth.
 * - The shared webhook secret (n8n header auth) lives only on the server and
 *   is never sent to, or revealed by, the frontend.
 * - Ownership of the journal is verified by the caller (uid is the verified
 *   Firebase UID, not a client-supplied value).
 */
export async function callN8nExport(payload: N8nExportPayload): Promise<{ requestId: string }> {
  if (!N8N_WEBHOOK_URL) {
    throw new Error('N8N_WEBHOOK_URL is not configured on the server.');
  }
  if (!N8N_WEBHOOK_SECRET) {
    throw new Error('N8N_WEBHOOK_SECRET is not configured on the server.');
  }

  const requestId = crypto.randomUUID();

  const response = await fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': N8N_WEBHOOK_SECRET,
      'X-Request-Id': requestId,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(
      `[n8n] Export webhook failed with status ${response.status} (request ${requestId}): ${body.substring(0, 300)}`,
    );
    throw new Error(`Drive automation webhook failed with status ${response.status}`);
  }

  return { requestId };
}