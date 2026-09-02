export function formatBytes(bytes: number | string, decimals = 2): string {
  const num = typeof bytes === 'number' ? bytes : Number(bytes);
  if (!Number.isFinite(num) || num <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(num) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((num / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/** Always formats as GB regardless of size — e.g. "8.24 GB". Handles numeric strings safely. */
export function formatGB(bytes: number | string, decimals = 2): string {
  const num = typeof bytes === 'number' ? bytes : Number(bytes);
  if (!Number.isFinite(num) || num < 0) return '0.00 GB';
  return `${(num / (1024 ** 3)).toFixed(decimals)} GB`;
}


export function formatDate(iso: string | Date, locale = 'en-US'): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(iso: string | Date, locale = 'en-US'): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function timeAgo(iso: string | Date): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (!Number.isFinite(seconds) || seconds < 0) return 'just now';
  const units: Array<[number, string]> = [
    [31536000, 'year'],
    [2592000, 'month'],
    [604800, 'week'],
    [86400, 'day'],
    [3600, 'hour'],
    [60, 'minute'],
  ];
  for (const [secs, label] of units) {
    const value = Math.floor(seconds / secs);
    if (value >= 1) return `${value} ${label}${value > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

export function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  if (parts.length < 2) return 'unknown';
  return parts.pop()?.toLowerCase() ?? 'unknown';
}

export function truncateFileName(fileName: string, max = 28): string {
  if (fileName.length <= max) return fileName;
  const extIndex = fileName.lastIndexOf('.');
  const extension = extIndex >= 0 ? fileName.slice(extIndex) : '';
  const name = fileName.slice(0, extIndex >= 0 ? extIndex : fileName.length);
  const keep = Math.max(4, max - extension.length - 3);
  return `${name.slice(0, keep)}…${extension}`;
}

export function isImageFile(fileName: string, mimeType: string): boolean {
  return mimeType.startsWith('image/') || /\.(png|jpe?g|gif|svg|webp|avif|bmp)$/i.test(fileName);
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'DF';
}
