'use client';

import { cn } from '@/lib/cn';
import { FORMATS, type OutputFormat } from '@/lib/font-types';

export type DownloadChoice = OutputFormat | 'all';

interface DownloadControlsProps {
  onDownload: (choice: DownloadChoice) => void;
  busy?: DownloadChoice;
  disabled?: boolean;
  size?: 'sm' | 'md';
  allowAll?: boolean;
  className?: string;
  tone?: 'default' | 'inverted';
}

const MORE_FORMATS: OutputFormat[] = ['woff', 'ttf'];

export function DownloadControls({ onDownload, busy, disabled, size = 'sm', allowAll, className, tone = 'default' }: DownloadControlsProps) {
  const base = cn(
    'inline-flex items-center gap-1.5 rounded-full font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
    size === 'sm' ? 'h-8 px-3.5 text-[13px]' : 'h-10 px-5 text-sm',
  );
  const isBusy = (choice: DownloadChoice) => busy === choice;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <button
        type="button"
        disabled={disabled || !!busy}
        onClick={() => onDownload('woff2')}
        className={cn(base, tone === 'inverted' ? 'bg-white text-ink hover:bg-ivory' : 'bg-ink text-ivory hover:bg-ink-700')}
      >
        {isBusy('woff2') ? <Spinner /> : <DownloadIcon />}
        Web <span className={tone === 'inverted' ? 'text-ink-400' : 'text-ivory/60'}>.woff2</span>
      </button>
      <button
        type="button"
        disabled={disabled || !!busy}
        onClick={() => onDownload('otf')}
        className={cn(
          base,
          tone === 'inverted'
            ? 'border border-white/40 text-white hover:border-white hover:bg-white/10'
            : 'border border-ink-200 bg-white text-ink hover:border-ink-400',
        )}
      >
        {isBusy('otf') ? <Spinner /> : <DownloadIcon />}
        Desktop <span className={tone === 'inverted' ? 'text-white/60' : 'text-ink-400'}>.otf</span>
      </button>
      <label className="relative">
        <span className="sr-only">More formats</span>
        <select
          disabled={disabled || !!busy}
          value=""
          onChange={(event) => {
            const value = event.target.value as DownloadChoice;
            if (value) onDownload(value);
          }}
          className={cn(
            base,
            'w-[8.5rem] cursor-pointer appearance-none border border-transparent bg-transparent pr-7',
            tone === 'inverted'
              ? 'text-white/80 hover:border-white/40 hover:text-white [&>option]:text-ink'
              : 'text-ink-500 hover:border-ink-200 hover:text-ink',
          )}
        >
          <option value="">{busy && !['woff2', 'otf'].includes(busy) ? 'Preparing…' : 'More formats'}</option>
          {MORE_FORMATS.map((format) => (
            <option key={format} value={format}>
              {FORMATS[format].label} · {FORMATS[format].use}
            </option>
          ))}
          {allowAll && <option value="all">All four formats</option>}
        </select>
        <svg
          className={cn('pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2', tone === 'inverted' ? 'text-white/70' : 'text-ink-400')}
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden
        >
          <path d="M3 4.5 6 7.5 9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </label>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 2.5v8m0 0L4.5 7M8 10.5 11.5 7M3 13.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('h-3.5 w-3.5 animate-spin', className)} viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
