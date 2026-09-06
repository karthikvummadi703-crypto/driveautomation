import axios from 'axios';
import { clearDriveToken, isDriveApiDisabledError, driveApiDisabledMessage } from '@/services/driveService';
import { GOOGLE_DRIVE_UPLOAD_ENDPOINT, MAX_FILE_SIZE_BYTES } from '@/config/constants';
import { formatBytes } from '@/utils/format';
import type { UploadResponse } from '@/types/upload';

export interface UploadFilePayload {
  file: File;
  accessToken: string;
  userId?: string;
  onProgress?: (percentage: number) => void;
}

export interface UploadResult {
  response: UploadResponse;
  durationMs: number;
}

interface DriveApiFile {
  id: string;
  name?: string;
  mimeType?: string;
  webViewLink?: string;
  createdTime?: string;
}

const driveClient = axios.create({
  timeout: 180_000,
  headers: { Accept: 'application/json' },
});

function driveErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const apiMessage =
      (error.response?.data as { error?: { message?: string } } | undefined)?.error?.message ?? '';
    if (apiMessage && isDriveApiDisabledError(apiMessage)) {
      return driveApiDisabledMessage();
    }
    if (status === 401) {
      return 'Your Google Drive session has expired. Please reconnect your Drive from Settings and try again.';
    }
    if (status === 403) {
      return apiMessage || 'Google Drive denied this upload. Check the file type and your Drive quota.';
    }
    if (status === 413) {
      return 'File is too large for Google Drive. Try a smaller file or check your Drive storage.';
    }
    if (status === 429) {
      return 'Too many upload requests. Please wait a moment and try again.';
    }
    if (apiMessage) return apiMessage;
    if (error.code === 'ECONNABORTED') return 'Upload timed out. Please check your connection and try again.';
    if (error.response) return `Google Drive responded with ${status}. Please try again.`;
    if (error.request) return 'No response from Google Drive. Check your internet connection.';
    return error.message || 'Upload failed. Please try again.';
  }
  if (error instanceof Error) return error.message;
  return 'Upload failed. Please try again.';
}

export async function uploadFileToDrive(payload: UploadFilePayload): Promise<UploadResult> {
  if (!payload.file.size) throw new Error('This file is empty. Please choose a different file.');
  if (payload.file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `File is ${formatBytes(payload.file.size)}. The maximum allowed size is ${formatBytes(MAX_FILE_SIZE_BYTES)}.`,
    );
  }

  const startedAt = Date.now();
  const boundary = `driveflow_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const mimeType = payload.file.type || 'application/octet-stream';
  const metadata = JSON.stringify({ name: payload.file.name, mimeType, parents: ['root'] });

  const body = new Blob(
    [
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
      `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
      payload.file,
      `\r\n--${boundary}--\r\n`,
    ],
    { type: `multipart/related; boundary=${boundary}` },
  );

  try {
    const { data } = await driveClient.post<DriveApiFile>(GOOGLE_DRIVE_UPLOAD_ENDPOINT, body, {
      params: {
        uploadType: 'multipart',
        fields: 'id,name,mimeType,webViewLink,createdTime',
      },
      headers: {
        Authorization: `Bearer ${payload.accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      onUploadProgress: (event) => {
        if (!payload.onProgress) return;
        if (event.total && event.total > 0) {
          payload.onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
        }
      },
    });

    if (!data.id) throw new Error('Google Drive did not return a file ID.');

    const driveLink =
      data.webViewLink ?? `https://drive.google.com/file/d/${data.id}/view?usp=sharing`;

    return {
      response: {
        success: true,
        message: 'File uploaded successfully',
        fileName: data.name || payload.file.name,
        driveLink,
        uploadedAt: data.createdTime || new Date().toISOString(),
      },
      durationMs: Date.now() - startedAt,
    };
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 401 && payload.userId) {
      await clearDriveToken(payload.userId);
    }
    throw new Error(driveErrorMessage(err));
  }
}
