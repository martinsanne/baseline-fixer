'use client';

import { cn } from '@/lib/cn';
import type { FixResult } from '@/lib/font-types';
import { AlignmentReport } from './alignment-report';
import { DownloadControls, type DownloadChoice } from './download-controls';
import { Drawer } from './drawer';
import type { Job } from './font-fixer';

type ReadyJob = Job & { result: FixResult };

interface ReportDrawerProps {
  open: boolean;
  job: ReadyJob | undefined;
  readyJobs: ReadyJob[];
  onNavigate: (id: string) => void;
  onClose: () => void;
  onDownload: (job: Job, choice: DownloadChoice) => void;
}

export function ReportDrawer({ open, job, readyJobs, onNavigate, onClose, onDownload }: ReportDrawerProps) {
  const index = job ? readyJobs.findIndex((j) => j.id === job.id) : -1;
  const previous = index > 0 ? readyJobs[index - 1] : undefined;
  const next = index >= 0 && index < readyJobs.length - 1 ? readyJobs[index + 1] : undefined;
  const names = job?.result.before.names;

  return (
    <Drawer
      open={open && !!job}
      onClose={onClose}
      labelledBy="report-title"
      onKeyDown={(event) => {
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
        if (event.key === 'ArrowLeft' && previous) onNavigate(previous.id);
        if (event.key === 'ArrowRight' && next) onNavigate(next.id);
      }}
    >
      {job && names && (
        <>
          <header className="border-b border-ivory-300 px-5 pb-4 pt-5 sm:px-8 sm:pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-wider text-ink-400">
                  Alignment report{readyJobs.length > 1 ? ` · ${index + 1} of ${readyJobs.length}` : ''}
                </p>
                <h2 id="report-title" className="mt-1.5 line-clamp-2 font-serif text-2xl tracking-tight sm:truncate sm:text-[28px]">
                  {names.family} {names.style}
                </h2>
                <p className="mt-0.5 truncate font-mono text-[12px] text-ink-400">{job.file.name}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {readyJobs.length > 1 && (
                  <>
                    <IconButton label="Previous font" disabled={!previous} onClick={() => previous && onNavigate(previous.id)}>
                      <path d="M10 3.5 5.5 8l4.5 4.5" />
                    </IconButton>
                    <IconButton label="Next font" disabled={!next} onClick={() => next && onNavigate(next.id)}>
                      <path d="M6 3.5 10.5 8 6 12.5" />
                    </IconButton>
                    <span className="mx-1 h-5 w-px bg-ivory-300" aria-hidden />
                  </>
                )}
                <IconButton label="Close report" onClick={onClose}>
                  <path d="M4 4l8 8M12 4l-8 8" />
                </IconButton>
              </div>
            </div>
            <div className="mt-4">
              <DownloadControls onDownload={(choice) => onDownload(job, choice)} busy={job.busyFormat} />
            </div>
          </header>

          <div key={`${job.id}:${job.run}`} className="flex-1 overflow-y-auto overscroll-contain px-5 py-8 sm:px-8">
            <AlignmentReport job={job} />
          </div>
        </>
      )}
    </Drawer>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-full text-ink-500 transition-colors',
        'hover:bg-ivory-200 hover:text-ink disabled:pointer-events-none disabled:opacity-30',
      )}
    >
      <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {children}
      </svg>
    </button>
  );
}
