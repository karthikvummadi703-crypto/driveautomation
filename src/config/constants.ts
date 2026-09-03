import type { UserSettings } from '@/types/auth';

export interface FirestoreCollectionNames {
  users: 'users';
  uploadHistory: 'uploadHistory';
  settings: 'settings';
  driveTokens: 'driveTokens';
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  theme: 'dark',
  emailNotifications: true,
  compactMode: false,
};

export const FIRESTORE_COLLECTIONS: FirestoreCollectionNames = {
  users: 'users',
  uploadHistory: 'uploadHistory',
  settings: 'settings',
  driveTokens: 'driveTokens',
};

export const MAX_FILE_SIZE_BYTES = 16 * 1024 * 1024;

/** Scope to upload/manage files created by this app. */
export const GOOGLE_DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

/** Scope required to read storage quota from the Drive about endpoint. */
export const GOOGLE_DRIVE_METADATA_SCOPE = 'https://www.googleapis.com/auth/drive.metadata.readonly';

/** Scope required to read Drive activity (Drive Activity API v2). */
export const GOOGLE_DRIVE_ACTIVITY_SCOPE = 'https://www.googleapis.com/auth/drive.activity.readonly';

/** Combined scopes requested for Drive access. */
export const GOOGLE_DRIVE_SCOPE = `${GOOGLE_DRIVE_FILE_SCOPE} ${GOOGLE_DRIVE_METADATA_SCOPE} ${GOOGLE_DRIVE_ACTIVITY_SCOPE}`;

export const GOOGLE_DRIVE_UPLOAD_ENDPOINT = 'https://www.googleapis.com/upload/drive/v3/files';

export const ACCEPTED_FILE_TYPES =
  'image/*,application/pdf,text/*,video/*,audio/*,.zip,.rar,.7z,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.json,.xml,.md';

export const FILE_TYPE_LABELS: Record<string, string> = {
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  pdf: 'PDF',
  document: 'Document',
  archive: 'Archive',
  code: 'Code',
  other: 'Other',
};

export const STORAGE_QUOTA_BYTES = 15 * 1024 * 1024 * 1024; // Free-tier Google Drive quota (15 GB)

export const APP_ROUTES = {
  home: '/',
  dashboard: '/dashboard',
  chat: '/chat',
  upload: '/upload',
  history: '/history',
  settings: '/settings',
  login: '/login',
  register: '/register',
  verifyEmail: '/verify-email',
  forgotPassword: '/forgot-password',
  connectDrive: '/connect-drive',
} as const;
