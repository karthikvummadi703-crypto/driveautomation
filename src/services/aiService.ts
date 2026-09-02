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

  async refreshDriveToken() {
    const { data } = await apiClient.post<{ accessToken: string }>(
      `${BACKEND_URL}/api/drive/token`,
      {},
      { headers: await this.authHeaders() },
    );
    return data.accessToken;
  },
};