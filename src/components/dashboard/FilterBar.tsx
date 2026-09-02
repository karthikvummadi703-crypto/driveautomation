import { RefreshCwIcon } from '@/components/ui/Icon';
import type { UploadSort, UploadStatus } from '@/types/upload';

export interface FilterValue {
  status: UploadStatus | 'all';
  fileType: string;
  sort: UploadSort;
}

export interface FilterBarProps {
  filters: FilterValue;
  onChange: (filters: FilterValue) => void;
  fileTypes: string[];
}

const SELECT_CLASSES =
  'h-10 rounded-xl border border-white/10 bg-navy-800 px-3 pr-8 text-sm text-slate-200 transition focus:border-electric focus:outline-none focus:ring-2 focus:ring-electric/30 cursor-pointer';

export function FilterBar({ filters, onChange, fileTypes }: FilterBarProps) {
  const update = (patch: Partial<FilterValue>) => onChange({ ...filters, ...patch });

  const hasActive =
    filters.status !== 'all' || filters.fileType !== 'all' || filters.sort !== 'newest';

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="sr-only" htmlFor="filter-status">Filter by status</label>
      <select
        id="filter-status"
        className={SELECT_CLASSES}
        value={filters.status}
        onChange={(e) => update({ status: e.target.value as UploadStatus | 'all' })}
      >
        <option value="all">All statuses</option>
        <option value="success">Successful</option>
        <option value="failed">Failed</option>
      </select>

      <label className="sr-only" htmlFor="filter-type">Filter by file type</label>
      <select
        id="filter-type"
        className={SELECT_CLASSES}
        value={filters.fileType}
        onChange={(e) => update({ fileType: e.target.value })}
      >
        <option value="all">All file types</option>
        {fileTypes.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="filter-sort">Sort uploads</label>
      <select
        id="filter-sort"
        className={SELECT_CLASSES}
        value={filters.sort}
        onChange={(e) => update({ sort: e.target.value as UploadSort })}
      >
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
        <option value="size">Largest first</option>
      </select>

      {hasActive && (
        <button
          onClick={() => onChange({ status: 'all', fileType: 'all', sort: 'newest' })}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-electric transition hover:bg-electric/10"
        >
          <RefreshCwIcon size={15} />
          Reset
        </button>
      )}
    </div>
  );
}
