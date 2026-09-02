import {
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  driveTokensCollection,
  settingsCollection,
  uploadHistoryCollection,
  usersCollection,
} from '@/firebase/firestore';
import type {
  DriveTokenRecord,
  UserProfile,
  UserProfilePatch,
  UserSettings,
} from '@/types/auth';
import type { UploadHistoryQuery, UploadRecord, UploadStats } from '@/types/upload';

/* ---------------------------------- Users ---------------------------------- */

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(usersCollection, uid));
  if (!snap.exists()) return null;
  return { ...snap.data(), uid };
}

export async function createUserProfile(uid: string, data: UserProfile): Promise<void> {
  await setDoc(doc(usersCollection, uid), data);
}

export async function updateUserProfile(uid: string, patch: UserProfilePatch): Promise<void> {
  await updateDoc(doc(usersCollection, uid), patch);
}

export async function deleteUserProfile(uid: string): Promise<void> {
  await deleteDoc(doc(usersCollection, uid));
}

/* ------------------------------- Upload history ------------------------------ */

function toFirestoreSafe(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      if (value === undefined) return [key, ''];
      if (typeof value === 'number' && Number.isNaN(value)) return [key, 0];
      return [key, value];
    }),
  );
}

export async function addUploadRecord(record: UploadRecord): Promise<UploadRecord> {
  const { id: _id, ...data } = record;
  const safeData = toFirestoreSafe(data);
  const ref = await addDoc(
    uploadHistoryCollection,
    safeData as Parameters<typeof addDoc>[1],
  );
  return { ...safeData, id: ref.id } as unknown as UploadRecord;
}

function sortNewestFirst(records: UploadRecord[]): UploadRecord[] {
  return [...records].sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
  );
}

export async function fetchUserRecords(uid: string): Promise<UploadRecord[]> {
  const snap = await getDocs(query(uploadHistoryCollection, where('userId', '==', uid)));
  return sortNewestFirst(snap.docs.map((d) => ({ ...(d.data() as UploadRecord), id: d.id })));
}

export function applyUploadQuery(
  records: UploadRecord[],
  queryOptions: UploadHistoryQuery = {},
): UploadRecord[] {
  let result = records;

  if (queryOptions.search) {
    const term = queryOptions.search.toLowerCase();
    result = result.filter(
      (r) =>
        r.fileName.toLowerCase().includes(term) ||
        r.fileType.toLowerCase().includes(term) ||
        r.email.toLowerCase().includes(term),
    );
  }
  if (queryOptions.status && queryOptions.status !== 'all') {
    result = result.filter((r) => r.status === queryOptions.status);
  }
  if (queryOptions.fileType && queryOptions.fileType !== 'all') {
    result = result.filter((r) => r.fileType === queryOptions.fileType);
  }
  if (queryOptions.sort === 'oldest') result = [...result].reverse();
  if (queryOptions.sort === 'size') result = [...result].sort((a, b) => b.fileSize - a.fileSize);

  return result;
}

export async function getUploadRecords(
  uid: string,
  queryOptions: UploadHistoryQuery = {},
  maxResults = 50,
): Promise<UploadRecord[]> {
  const records = await fetchUserRecords(uid);
  const filtered = applyUploadQuery(records, queryOptions);
  return maxResults > 0 ? filtered.slice(0, maxResults) : filtered;
}

export function computeUploadStats(records: UploadRecord[], maxRecent = 5): UploadStats {
  const successCount = records.filter((r) => r.status === 'success').length;
  return {
    totalUploads: records.length,
    totalSize: records.reduce((sum, r) => sum + (r.fileSize || 0), 0),
    successCount,
    failedCount: records.length - successCount,
    recentUploads: records.slice(0, maxRecent),
  };
}

export async function getUploadStats(uid: string, maxRecent = 5): Promise<UploadStats> {
  const records = await fetchUserRecords(uid);
  return computeUploadStats(records, maxRecent);
}

export async function removeUploadRecord(uid: string, recordId: string): Promise<void> {
  const ref = doc(uploadHistoryCollection, recordId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  if (snap.data().userId !== uid) {
    throw new Error('You can only remove your own uploads.');
  }
  await deleteDoc(ref);
}

export async function clearUploadHistory(uid: string): Promise<void> {
  const records = await fetchUserRecords(uid);
  await Promise.all(records.map((r) => deleteDoc(doc(uploadHistoryCollection, r.id))));
}

/* --------------------------------- Settings --------------------------------- */

const settingsRef = (uid: string) => doc(settingsCollection, uid);

export async function getUserSettings(uid: string): Promise<UserSettings | null> {
  const snap = await getDoc(settingsRef(uid));
  if (!snap.exists()) return null;
  return snap.data() as unknown as UserSettings;
}

export async function saveUserSettings(uid: string, settings: UserSettings): Promise<void> {
  await setDoc(settingsRef(uid), settings);
}

/* ------------------------------- Drive tokens ------------------------------- */

const driveTokenRef = (uid: string) => doc(driveTokensCollection, uid);

export async function getDriveToken(uid: string): Promise<DriveTokenRecord | null> {
  const snap = await getDoc(driveTokenRef(uid));
  if (!snap.exists()) return null;
  return { ...snap.data(), uid } as DriveTokenRecord;
}

export async function saveDriveToken(uid: string, record: DriveTokenRecord): Promise<void> {
  await setDoc(driveTokenRef(uid), record);
}

export async function deleteDriveToken(uid: string): Promise<void> {
  await deleteDoc(driveTokenRef(uid));
}
