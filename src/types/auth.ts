export type AuthProvider = 'google.com' | 'password';

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  emailNotifications: boolean;
  compactMode: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  provider: AuthProvider;
  createdAt: string;
  settings: UserSettings;
  /** Email of the Google Drive account the user has connected. Persists across sessions. */
  connectedDriveEmail?: string | null;
}

export type UserProfilePatch = Partial<
  Pick<UserProfile, 'displayName' | 'photoURL' | 'connectedDriveEmail'> & {
    settings: UserSettings;
  }
>;

export interface DriveTokenRecord {
  uid: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt: number;
  grantedAt: number;
  driveEmail: string | null;
}
