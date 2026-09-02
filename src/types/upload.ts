export type UploadStatus = 'success' | 'failed';

export interface UploadRecord {
  id: string;
  userId: string;
  email: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  driveLink: string;
  status: UploadStatus;
  uploadedAt: string;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  error?: string;
  fileName: string;
  driveLink: string;
  uploadedAt: string;
}

export interface DriveUploadResult {
  fileId: string;
  fileName: string;
  mimeType: string;
  driveLink: string;
  uploadedAt: string;
}

export type UploadSort = 'newest' | 'oldest' | 'size';

export interface UploadHistoryQuery {
  search?: string;
  status?: UploadStatus | 'all';
  fileType?: string;
  sort?: UploadSort;
}

export interface UploadStats {
  totalUploads: number;
  totalSize: number;
  successCount: number;
  failedCount: number;
  recentUploads: UploadRecord[];
}
