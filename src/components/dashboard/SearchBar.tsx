import { useEffect, useState } from 'react';
import { SearchIcon, XIcon } from '@/components/ui/Icon';

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Search files…', label = 'Search uploads' }: SearchBarProps) {
  const [internal, setInternal] = useState(value);

  useEffect(() => {
    setInternal(value);
  }, [value]);

  useEffect(() => {
    const handler = window.setTimeout(() => {
      if (internal !== value) onChange(internal);
    }, 300);
    return () => window.clearTimeout(handler);
  }, [internal, onChange, value]);

  return (
    <div className="relative w-full">
      <label htmlFor="search-uploads" className="sr-only">
        {label}
      </label>
      <SearchIcon size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        id="search-uploads"
        type="search"
        value={internal}
        onChange={(e) => setInternal(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-white/10 bg-white/5 pl-11 pr-10 text-sm text-white placeholder:text-slate-500 transition focus:border-electric focus:outline-none focus:ring-2 focus:ring-electric/30"
      />
      {internal && (
        <button
          onClick={() => setInternal('')}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
        >
          <XIcon size={15} />
        </button>
      )}
    </div>
  );
}
