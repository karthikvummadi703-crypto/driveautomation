import { getAdminFirestore } from './firebaseAdmin.js';

export interface DriveExportRecord {
  id: string;
  userId: string;
  journalEntryId?: string;
  summaryId?: string;
  source: string;
  fileName: string;
  driveLink?: string;
  fileId?: string;
  status: 'pending' | 'success' | 'failed';
  error?: string;
  createdAt: string;
  updatedAt: string;
}

function exportsCollection(uid: string) {
  const db = getAdminFirestore();
  return db.collection('users').doc(uid).collection('driveExports');
}

export async function createDriveExportRecord(
  uid: string,
  data: Omit<DriveExportRecord, 'id' | 'createdAt' | 'updatedAt' | 'userId'>,
): Promise<DriveExportRecord> {
  const now = new Date().toISOString();
  const ref = await exportsCollection(uid).add({
    ...data,
    userId: uid,
    createdAt: now,
    updatedAt: now,
  });
  return { id: ref.id, ...data, userId: uid, createdAt: now, updatedAt: now };
}

export async function updateDriveExportRecord(
  uid: string,
  exportId: string,
  patch: Partial<Pick<DriveExportRecord, 'status' | 'driveLink' | 'fileId' | 'error'>>,
): Promise<void> {
  const ref = exportsCollection(uid).doc(exportId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('Drive export record not found');
  await ref.update({ ...patch, updatedAt: new Date().toISOString() });
}

export async function getDriveExportRecords(uid: string): Promise<DriveExportRecord[]> {
  const snap = await exportsCollection(uid).orderBy('createdAt', 'desc').get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as DriveExportRecord));
}

export function buildJournalExportMarkdown(input: {
  title: string;
  content: string;
  summary?: string;
  keyPoints?: string[];
  actionItems?: string[];
  userEmail?: string | null;
  exportedAt: string;
}): string {
  const lines: string[] = [];

  lines.push(`# ${input.title}`);
  lines.push('');
  if (input.userEmail) {
    lines.push(`Author: ${input.userEmail}`);
  }
  lines.push(`Exported: ${new Date(input.exportedAt).toLocaleString()}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(input.content);
  lines.push('');

  if (input.summary) {
    lines.push('---');
    lines.push('');
    lines.push('## Summary');
    lines.push('');
    lines.push(input.summary);
    lines.push('');
  }

  if (input.keyPoints && input.keyPoints.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## Key Points');
    lines.push('');
    for (const point of input.keyPoints) {
      lines.push(`- ${point}`);
    }
    lines.push('');
  }

  if (input.actionItems && input.actionItems.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## Action Items');
    lines.push('');
    for (const item of input.actionItems) {
      lines.push(`- [ ] ${item}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}