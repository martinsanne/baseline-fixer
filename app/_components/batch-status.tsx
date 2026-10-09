'use client';

import { cn } from '@/lib/cn';
import { DownloadControls, Spinner, type DownloadChoice } from './download-controls';
import { ProgressBar } from './file-list';

interface BatchStatusProps {
  total: number;
  done: number;
  failed: number;
  progress: number;
  busy?: DownloadChoice;
  onDownloadAll: (choice: DownloadChoice) => void;
}

/** Summary bar above the file list: a progress bar while working, a solid confirmation when finished. */
export function BatchStatus({ total, done, failed, progress, busy, onDownloadAll }: BatchStatusProps) {
  const complete = done + failed === total;
  const state = !complete ? 'working' : done > 0 ? 'done' : 'failed';
  const plural = (count: number) => (count === 1 ? 'font' : 'fonts');

  return (
    <div
      aria-live="polite"
      className={cn(
        'rounded-2xl px-4 py-3.5 transition-colors duration-500 sm:px-5',
        state === 'working' && 'bg-ivory-100 text-ink',
        state === 'done' && 'bg-olive text-white',
        state === 'failed' && 'bg-clay-dark text-white',
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <StatusIcon state={state} />
          <div>
            {state === 'working' && (
              <>
                <p className="text-sm font-medium">Processing {total} {plural(total)}</p>
                <p className="text-[13px] text-ink-500">
                  {done + failed} of {total} finished · <span className="font-mono">{Math.round(progress * 100)}%</span>
                </p>
              </>
            )}
            {state === 'done' && (
              <>
                <p className="text-sm font-medium">
                  {done} {plural(done)} ready{failed > 0 && <span className="font-normal text-white/80"> · {failed} failed</span>}
                </p>
                <p className="text-[13px] text-white/80">Centered on every system. Open a font to see its alignment report.</p>
              </>
            )}
            {state === 'failed' && (
              <>
                <p className="text-sm font-medium">{total === 1 ? 'This font' : 'These fonts'} could not be processed</p>
                <p className="text-[13px] text-white/80">See the error on each file below.</p>
              </>
            )}
          </div>
        </div>
        {state === 'done' && done > 1 && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <span className="whitespace-nowrap text-[13px] text-white/80">All as .zip</span>
            <DownloadControls onDownload={onDownloadAll} busy={busy} allowAll tone="inverted" />
          </div>
        )}
      </div>
      {state === 'working' && <ProgressBar value={progress} className="mt-3" />}
    </div>
  );
}

function StatusIcon({ state }: { state: 'working' | 'done' | 'failed' }) {
  if (state === 'working') {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-clay">
        <Spinner className="h-4 w-4" />
      </span>
    );
  }
  return (
    <span
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white',
        state === 'done' ? 'text-olive' : 'text-clay-dark',
      )}
    >
      <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {state === 'done' ? <path d="M3.5 8.5 6.5 11.5 12.5 4.5" /> : <path d="M8 4v5M8 12h.01" />}
      </svg>
    </span>
  );
}
