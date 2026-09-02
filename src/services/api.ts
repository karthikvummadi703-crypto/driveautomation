import axios, { AxiosError } from 'axios';

export const apiClient = axios.create({
  timeout: 180_000,
  headers: { Accept: 'application/json' },
});

export interface ApiErrorDetail {
  message: string;
  status?: number;
}

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;
    const payloadMessage =
      axiosError.response?.data?.message ?? axiosError.response?.data?.error;
    if (payloadMessage) return payloadMessage;
    if (axiosError.code === 'ECONNABORTED') return 'Request timed out. Please try again.';
    if (axiosError.response) {
      return `Server responded with ${axiosError.response.status}. Please try again.`;
    }
    if (axiosError.request) return 'No response from the server. Check your connection.';
    return axiosError.message || 'Network request failed.';
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}
