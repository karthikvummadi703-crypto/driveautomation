import { collection, type CollectionReference } from 'firebase/firestore';
import { db } from './app';
import { FIRESTORE_COLLECTIONS } from '@/config/constants';
import type { DriveTokenRecord, UserProfile, UserSettings } from '@/types/auth';
import type { UploadRecord } from '@/types/upload';

export const usersCollection = collection(
  db,
  FIRESTORE_COLLECTIONS.users,
) as CollectionReference<UserProfile>;

export const uploadHistoryCollection = collection(
  db,
  FIRESTORE_COLLECTIONS.uploadHistory,
) as CollectionReference<UploadRecord>;

export const settingsCollection = collection(
  db,
  FIRESTORE_COLLECTIONS.settings,
) as CollectionReference<UserSettings>;

export const driveTokensCollection = collection(
  db,
  FIRESTORE_COLLECTIONS.driveTokens,
) as CollectionReference<DriveTokenRecord>;
