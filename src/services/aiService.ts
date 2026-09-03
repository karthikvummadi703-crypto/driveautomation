import { getAuth } from 'firebase/auth';
import { app } from '@/firebase/app';
import { apiClient } from './api';

const AUTH = getAuth(app);

const BACKEND_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3001';

export const aiApi = {
  baseUrl: BACKEND_URL,

  async authHeaders(): Promise<Record<string, string>> {
    const user = AUTH.currentUser;
    if (!user) throw new Error('You must be signed in.');
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  },

  async sendMessage(message: string, conversationId?: string) {
    const { data } = await apiClient.post(
      `${BACKEND_URL}/api/chat`,
      { message, conversationId },
      { headers: await this.authHeaders() },
    );
    return data as { reply: string; conversationId: string; sources?: string[] };
  },

  /**
   * Stream a chat message via SSE from GET/POST /api/chat/stream. Renders text
   * progressively through onChunk so users see the answer being typed instead
   * of waiting for the full response. Resolves with the final metadata.
   */
  async sendMessageStream(
    message: string,
    conversationId: string | undefined,
    onChunk: (text: string) => void,
    signal?: AbortSignal,
  ): Promise<{ conversationId: string; sources: string[]; reply: string }> {
    const headers = await this.authHeaders();
    headers['Content-Type'] = 'application/json';

    const res = await fetch(`${BACKEND_URL}/api/chat/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message, conversationId }),
      signal,
    });

    if (!res.ok || !res.body) {
      let msg = `Chat streaming failed (${res.status}).`;
      try {
        const data = await res.json();
        if (data?.error) msg = data.error;
      } catch {
        // ignore parse failures
      }
      throw new Error(msg);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';
    let finalConversationId: string | undefined = conversationId;
    let finalSources: string[] = [];
    let lastError: Error | null = null;

    const processLine = (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      if (!trimmed.startsWith('data:')) return;
      const payload = trimmed.slice(5).trim();
      if (!payload) return;
      let parsed: {
        t?: string;
        conversationId?: string;
        sources?: string[];
        error?: string;
        reply?: string;
      };
      try {
        parsed = JSON.parse(payload);
      } catch {
        return;
      }
      if (typeof parsed.t === 'string') {
        fullText += parsed.t;
        onChunk(parsed.t);
      }
      if (parsed.conversationId) {
        finalConversationId = parsed.conversationId;
      }
      if (Array.isArray(parsed.sources)) {
        finalSources = parsed.sources;
      }
      if (typeof parsed.reply === 'string' && parsed.reply.length > fullText.length) {
        // Guard: if we somehow missed chunk frames but have a full reply,
        // surface it for a complete result.
        fullText = parsed.reply;
      }
      if (parsed.error) {
        lastError = new Error(parsed.error);
      }
    };

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          processLine(line);
        }
      }
      if (buffer.trim()) processLine(buffer);
    } finally {
      reader.releaseLock();
    }

    if (lastError) throw lastError;

    return {
      conversationId: finalConversationId ?? '',
      sources: finalSources,
      reply: fullText,
    };
  },

  async listConversations() {
    const { data } = await apiClient.get(
      `${BACKEND_URL}/api/chat/conversations`,
      { headers: await this.authHeaders() },
    );
    return data as { conversations: unknown[] };
  },

  async getConversation(conversationId: string) {
    const { data } = await apiClient.get(
      `${BACKEND_URL}/api/chat/conversations/${conversationId}`,
      { headers: await this.authHeaders() },
    );
    return data as { conversation: unknown };
  },

  async listJournalEntries() {
    const { data } = await apiClient.get(`${BACKEND_URL}/api/journal`, {
      headers: await this.authHeaders(),
    });
    return data as { entries: unknown[] };
  },

  async createJournalEntry(title: string, content: string) {
    const { data } = await apiClient.post(
      `${BACKEND_URL}/api/journal`,
      { title, content },
      { headers: await this.authHeaders() },
    );
    return data as { entry: unknown };
  },

  async getJournalEntry(entryId: string) {
    const { data } = await apiClient.get(`${BACKEND_URL}/api/journal/${entryId}`, {
      headers: await this.authHeaders(),
    });
    return data as { entry: unknown };
  },

  async summarizeJournalEntry(entryId: string) {
    const { data } = await apiClient.post(
      `${BACKEND_URL}/api/journal/${entryId}/summarize`,
      {},
      { headers: await this.authHeaders() },
    );
    return data as { summary: unknown };
  },

  async exportJournalEntry(entryId: string) {
    const { data } = await apiClient.post(
      `${BACKEND_URL}/api/journal/${entryId}/export`,
      {},
      { headers: await this.authHeaders() },
    );
    return data as { exportId: string; status: string; message: string };
  },

  async listSummaries() {
    const { data } = await apiClient.get(`${BACKEND_URL}/api/journal/summaries/list`, {
      headers: await this.authHeaders(),
    });
    return data as { summaries: unknown[] };
  },

  async listExports() {
    const { data } = await apiClient.get(`${BACKEND_URL}/api/journal/exports/list`, {
      headers: await this.authHeaders(),
    });
    return data as { exports: unknown[] };
  },

  /**
   * Begin the server-side OAuth authorization-code Drive connection flow.
   * Returns the Google authorization URL; the caller navigates the browser to
   * it. On success Google redirects back to the backend /oauth/callback which
   * stores the refresh token server-side.
   */
  async startDriveOAuth() {
    const { data } = await apiClient.get<{ url: string }>(
      `${BACKEND_URL}/api/drive/oauth/start`,
      { headers: await this.authHeaders() },
    );
    return data.url;
  },

  async refreshDriveToken() {
    const { data } = await apiClient.post<{ accessToken: string }>(
      `${BACKEND_URL}/api/drive/token`,
      {},
      { headers: await this.authHeaders() },
    );
    return data.accessToken;
  },

  /**
   * Fetch the user's real Google Drive storage quota from the backend. The
   * backend refreshes expired access tokens server-side (using the stored
   * refresh token) and caches results, so the frontend never needs to call the
   * Google API directly (which would fail silently once the access token
   * expires ~1h after login).
   */
  async getDriveStorage() {
    const { data } = await apiClient.get<{
      storage: {
        limit: number;
        usage: number;
        usageInDrive: number;
        usageInDriveTrash: number;
        remaining: number;
        usagePercentage: number;
        unlimited: boolean;
      };
    }>(`${BACKEND_URL}/api/drive/storage`, { headers: await this.authHeaders() });
    return data.storage;
  },

  /**
   * Check the server-side Drive connection status for the authenticated user.
   * Returns whether Drive is connected and the associated Drive email.
   * This is the authoritative source of truth — not localStorage.
   */
  async getDriveStatus() {
    const { data } = await apiClient.get(
      `${BACKEND_URL}/api/drive/status`,
      { headers: await this.authHeaders() },
    );
    return data as { connected: boolean; driveEmail: string | null; refreshed?: boolean; reason?: string };
  },

  /**
   * Persist OAuth tokens to the backend (drives the server-side refresh flow) —
   * after the GIS consent route / redirect has produced new tokens.
   */
  async saveDriveTokens(
    accessToken: string,
    refreshToken: string | null,
    driveEmail: string | null,
  ) {
    const { data } = await apiClient.post(
      `${BACKEND_URL}/api/drive/connect`,
      { accessToken, refreshToken, driveEmail },
      { headers: await this.authHeaders() },
    );
    return data as { connected: boolean; driveEmail: string | null };
  },

  /**
   * Explicitly disconnect the user's Drive connection server-side (clears the
   * stored refresh token + access token). Called when the user clicks
   * "Disconnect" so their Drive is not resurrectable from another device.
   */
  async disconnectDrive() {
    const { data } = await apiClient.post(
      `${BACKEND_URL}/api/drive/disconnect`,
      {},
      { headers: await this.authHeaders() },
    );
    return data as { disconnected: boolean };
  },
};