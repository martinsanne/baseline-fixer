'use client';

import { describeOffset, offsetPx } from '@/lib/alignment';
import { cn } from '@/lib/cn';
import { formatBytes } from '@/lib/fix-font-client';
import { PLATFORMS } from '@/lib/font-types';
import { DownloadControls, Spinner, type DownloadChoice } from './download-controls';
import type { Job } from './font-fixer';

interface FileListProps {
  jobs: Job[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  onDownload: (job: Job, choice: DownloadChoice) => void;
}

export function FileList({ jobs, selectedId, onSelect, onRemove, onRetry, onDownload }: FileListProps) {
  return (
    <ul className="divide-y divide-ivory-300 rounded-2xl border border-ivory-300 bg-white">
      {jobs.map((job) => (
        <FileRow
          key={job.id}
          job={job}
          selected={job.id === selectedId}
          onSelect={() => onSelect(job.id)}
          onRemove={() => onRemove(job.id)}
          onRetry={() => onRetry(job.id)}
          onDownload={(choice) => onDownload(job, choice)}
        />
      ))}
    </ul>
  );
}

interface FileRowProps {
  job: Job;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onRetry: () => void;
  onDownload: (choice: DownloadChoice) => void;
}

function FileRow({ job, selected, onSelect, onRemove, onRetry, onDownload }: FileRowProps) {
  const result = job.result;
  const names = result?.before.names;
  const done = job.status === 'done';

  return (
    <li className={cn('relative transition-colors', selected && done ? 'bg-ivory-100' : '')}>
      {selected && done && <span className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-clay" aria-hidden />}
      <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
        <button
          type="button"
          onClick={onSelect}
          disabled={!done}
          aria-pressed={selected}
          className="group min-w-0 flex-1 text-left disabled:cursor-default"
        >
          <span className="flex items-baseline gap-2">
            <span className="truncate text-[15px] font-medium text-ink">
              {names ? `${names.family} ${names.style}` : job.file.name}
            </span>
            <span className="shrink-0 font-mono text-[11px] text-ink-400">{formatBytes(job.file.size)}</span>
          </span>
          <span className="mt-0.5 block truncate text-[13px] text-ink-500">
            {names && <span className="text-ink-400">{job.file.name} · </span>}
            <StatusText job={job} />
          </span>
          {done && !selected && (
            <span className="mt-1 hidden text-[12px] text-clay-dark opacity-0 sm:block transition-opacity group-hover:opacity-100">
              Show alignment report →
            </span>
          )}
        </button>

        <div className="flex items-center gap-2 sm:justify-end">
          {done && <DownloadControls onDownload={onDownload} busy={job.busyFormat} className="flex-1 sm:flex-none" />}
          {job.status === 'error' && (
            <button type="button" onClick={onRetry} className="h-8 rounded-full border border-ink-200 px-3.5 text-[13px] hover:border-ink-400">
              Retry
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-400 hover:bg-ivory-200 hover:text-ink sm:ml-0"
            aria-label={`Remove ${job.file.name}`}
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
      {!done && <ProgressBar value={job.progress} tone={job.status === 'error' ? 'error' : 'active'} className="mx-4 mb-3 sm:mx-5" />}
    </li>
  );
}

function StatusText({ job }: { job: Job }) {
  switch (job.status) {
    case 'queued':
      return <span>Waiting…</span>;
    case 'uploading':
      return (
        <span className="inline-flex items-center gap-1.5">
          <Spinner className="h-3 w-3" /> Uploading {Math.round(job.progress * 100)}%
        </span>
      );
    case 'processing':
      return (
        <span className="inline-flex items-center gap-1.5">
          <Spinner className="h-3 w-3" /> Measuring glyphs and rewriting metrics…
        </span>
      );
    case 'error':
      return <span className="text-clay-dark">{job.error}</span>;
    case 'done': {
      const result = job.result!;
      const worst = (analysis: typeof result.before) =>
        PLATFORMS.map((p) => offsetPx(analysis, p.key, result.align)).reduce(
          (max, value) => (Math.abs(value) > Math.abs(max) ? value : max),
          0,
        );
      const after = worst(result.after);
      return (
        <span>
          Was <span className="text-ink">{describeOffset(worst(result.before))}</span> at worst →{' '}
          <span className="text-olive">
            {describeOffset(after) === 'centered' ? 'centered on every system' : `${describeOffset(after)} at most`}
          </span>
        </span>
      );
    }
  }
}

export function ProgressBar({ value, tone = 'active', className }: { value: number; tone?: 'active' | 'error' | 'done'; className?: string }) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={cn('h-1 overflow-hidden rounded-full bg-ivory-200', className)}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-300 ease-out',
          tone === 'error' ? 'bg-clay-dark' : tone === 'done' ? 'bg-olive' : 'bg-clay',
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
