import { ACCEPTED_FILE_TYPES } from '@/config/constants';

const ACCEPTED_PATTERNS = ACCEPTED_FILE_TYPES.split(',')
  .map((pattern) => pattern.trim().toLowerCase())
  .filter(Boolean);

export function isAcceptedFileType(file: File): boolean {
  const mime = file.type.toLowerCase();
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

  return ACCEPTED_PATTERNS.some((pattern) => {
    if (pattern.endsWith('/*')) return mime.startsWith(pattern.slice(0, -1));
    if (pattern.startsWith('.')) return extension === pattern.slice(1);
    return mime === pattern;
  });
}
