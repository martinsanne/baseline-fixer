'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import {
  base64ToBytes,
  formatBytes,
  isFontFile,
  MAX_FILE_BYTES,
  requestFix,
  saveBlob,
} from '@/lib/fix-font-client';
import {
  DEFAULT_FORMATS,
  FORMATS,
  type AlignTarget,
  type FixResult,
  type FontOutput,
  type OutputFormat,
} from '@/lib/font-types';
import { createZip, type ZipEntry } from '@/lib/zip';
import { BatchStatus } from './batch-status';
import { type DownloadChoice } from './download-controls';
import { DropZone } from './drop-zone';
import { FileList } from './file-list';
import { ReportDrawer } from './report-drawer';

export interface Job {
  id: string;
  run: number;
  file: File;
  status: 'queued' | 'uploading' | 'processing' | 'done' | 'error';
  progress: number;
  result?: FixResult;
  error?: string;
  busyFormat?: DownloadChoice;
}

type ReadyOutput = Extract<FontOutput, { data: string }>;

const CONCURRENCY = 3;
const ALL_FORMATS: OutputFormat[] = ['woff2', 'otf', 'woff', 'ttf'];

export function FontFixer() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [align, setAlign] = useState<AlignTarget>('cap');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [batchBusy, setBatchBusy] = useState<DownloadChoice | undefined>();
  const jobsRef = useRef(jobs);
  const alignRef = useRef(align);
  const started = useRef(new Set<string>());
  jobsRef.current = jobs;

  const patchJob = useCallback((id: string, run: number | null, patch: Partial<Job> | ((job: Job) => Partial<Job>)) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === id && (run === null || job.run === run) ? { ...job, ...(typeof patch === 'function' ? patch(job) : patch) } : job,
      ),
    );
  }, []);

  const runJob = useCallback(
    async (job: Job) => {
      const { id, run } = job;
      patchJob(id, run, { status: 'uploading', progress: 0.02, error: undefined });

      // Upload is measurable; server processing is not, so ease toward 95% until it answers.
      let creep: ReturnType<typeof setInterval> | undefined;
      const startProcessing = () => {
        if (creep) return;
        patchJob(id, run, { status: 'processing', progress: 0.5 });
        creep = setInterval(() => patchJob(id, run, (j) => ({ progress: j.progress + (0.95 - j.progress) * 0.12 })), 180);
      };

      try {
        const result = await requestFix(job.file, { align: alignRef.current, formats: DEFAULT_FORMATS }, (fraction) => {
          if (fraction >= 1) startProcessing();
          else patchJob(id, run, { progress: 0.02 + fraction * 0.48 });
        });
        patchJob(id, run, { status: 'done', progress: 1, result });
      } catch (error) {
        patchJob(id, run, { status: 'error', progress: 1, error: error instanceof Error ? error.message : String(error) });
      } finally {
        if (creep) clearInterval(creep);
      }
    },
    [patchJob],
  );

  // Queue runner: keep up to CONCURRENCY uploads in flight.
  useEffect(() => {
    const active = jobs.filter((job) => job.status === 'uploading' || job.status === 'processing').length;
    const next = jobs.filter((job) => job.status === 'queued' && !started.current.has(`${job.id}:${job.run}`));
    next.slice(0, Math.max(0, CONCURRENCY - active)).forEach((job) => {
      started.current.add(`${job.id}:${job.run}`);
      void runJob(job);
    });
  }, [jobs, runJob]);

  const addFiles = (files: File[]) => {
    const rejected: string[] = [];
    const accepted = files.filter((file) => {
      if (!isFontFile(file)) rejected.push(`${file.name} is not a font file`);
      else if (file.size > MAX_FILE_BYTES) rejected.push(`${file.name} is ${formatBytes(file.size)}, over the 4 MB limit`);
      else return true;
      return false;
    });
    setNotice(rejected.length ? `Skipped: ${rejected.join('; ')}.` : null);
    setJobs((prev) => [
      ...prev,
      ...accepted.map((file) => ({ id: crypto.randomUUID(), run: 0, file, status: 'queued' as const, progress: 0 })),
    ]);
  };

  const requeue = (predicate: (job: Job) => boolean) =>
    setJobs((prev) =>
      prev.map((job) =>
        predicate(job) ? { ...job, run: job.run + 1, status: 'queued', progress: 0, result: undefined, error: undefined } : job,
      ),
    );

  const changeAlign = (next: AlignTarget) => {
    if (next === align) return;
    setAlign(next);
    alignRef.current = next;
    requeue(() => true);
  };

  const removeJob = (id: string) => setJobs((prev) => prev.filter((job) => job.id !== id));

  const openReport = (id: string) => {
    setSelectedId(id);
    setReportOpen(true);
  };

  /** Returns a format for a finished job, converting on the server if it was not generated yet. */
  const ensureOutput = async (id: string, format: OutputFormat): Promise<ReadyOutput> => {
    const job = jobsRef.current.find((j) => j.id === id);
    if (!job?.result) throw new Error('Font is not ready yet');
    const existing = job.result.outputs[format];
    if (existing && 'data' in existing) return existing;
    if (existing && 'error' in existing) throw new Error(existing.error);

    const fresh = await requestFix(job.file, { align: job.result.align, formats: [format] }, () => {});
    const output = fresh.outputs[format];
    patchJob(id, job.run, (j) => (j.result ? { result: { ...j.result, outputs: { ...j.result.outputs, [format]: output } } } : {}));
    if (!output || 'error' in output) throw new Error(output?.error ?? `Could not create ${FORMATS[format].label}`);
    return output;
  };

  const downloadOne = async (job: Job, choice: DownloadChoice) => {
    patchJob(job.id, null, { busyFormat: choice });
    try {
      const formats = choice === 'all' ? ALL_FORMATS : [choice];
      const outputs = await Promise.all(formats.map((format) => ensureOutput(job.id, format)));
      if (outputs.length === 1) {
        saveBlob(new Blob([base64ToBytes(outputs[0].data)], { type: FORMATS[formats[0]].mime }), outputs[0].filename);
      } else {
        saveBlob(createZip(outputs.map(toZipEntry)), `${baseName(job.file.name)}-aligned.zip`);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    } finally {
      patchJob(job.id, null, { busyFormat: undefined });
    }
  };

  const downloadAll = async (choice: DownloadChoice) => {
    const ready = jobsRef.current.filter((job) => job.status === 'done');
    const formats = choice === 'all' ? ALL_FORMATS : [choice];
    setBatchBusy(choice);
    try {
      const entries: ZipEntry[] = [];
      for (const job of ready) {
        for (const format of formats) {
          const output = await ensureOutput(job.id, format);
          const folder = choice === 'all' ? `${format}/` : '';
          entries.push({ ...toZipEntry(output), name: folder + output.filename });
        }
      }
      saveBlob(createZip(dedupe(entries)), choice === 'all' ? 'aligned-fonts.zip' : `aligned-fonts-${choice}.zip`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setBatchBusy(undefined);
    }
  };

  const readyJobs = jobs.filter((job): job is Job & { result: FixResult } => job.status === 'done' && !!job.result);
  const failedCount = jobs.filter((job) => job.status === 'error').length;
  const totalProgress = jobs.length ? jobs.reduce((sum, job) => sum + job.progress, 0) / jobs.length : 0;
  const selected = readyJobs.find((job) => job.id === selectedId);

  // Close the report if its font was removed or is being reprocessed.
  useEffect(() => {
    if (reportOpen && !selected) setReportOpen(false);
  }, [reportOpen, selected]);

  return (
    <>
      <section
        id="tool"
        className="rounded-[28px] border border-ivory-300 bg-white/70 p-3 shadow-[0_1px_0_rgba(20,20,19,0.04),0_24px_48px_-24px_rgba(20,20,19,0.12)] sm:p-4"
      >
        <div className="flex flex-col gap-3 px-2 pb-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
          <AlignToggle value={align} onChange={changeAlign} />
          <p className="text-[13px] text-ink-400">Fonts are processed in memory and never stored.</p>
        </div>

        <DropZone onFiles={addFiles} compact={jobs.length > 0}>
          {jobs.length > 0 && (
            <div className="mt-3 space-y-3">
              <BatchStatus
                total={jobs.length}
                done={readyJobs.length}
                failed={failedCount}
                progress={totalProgress}
                busy={batchBusy}
                onDownloadAll={downloadAll}
              />
              <FileList
                jobs={jobs}
                selectedId={reportOpen ? selected?.id ?? null : null}
                onSelect={openReport}
                onRemove={removeJob}
                onRetry={(id) => requeue((job) => job.id === id)}
                onDownload={downloadOne}
              />
            </div>
          )}
        </DropZone>

        {notice && (
          <p role="status" className="mt-3 flex items-start justify-between gap-4 rounded-xl bg-clay-light/50 px-4 py-3 text-sm text-ink-700">
            {notice}
            <button type="button" onClick={() => setNotice(null)} className="text-ink-400 hover:text-ink" aria-label="Dismiss">
              ×
            </button>
          </p>
        )}
      </section>

      <ReportDrawer
        open={reportOpen}
        job={selected}
        readyJobs={readyJobs}
        onNavigate={setSelectedId}
        onClose={() => setReportOpen(false)}
        onDownload={downloadOne}
      />
    </>
  );
}

function AlignToggle({ value, onChange }: { value: AlignTarget; onChange: (value: AlignTarget) => void }) {
  const options: { value: AlignTarget; label: string; hint: string }[] = [
    { value: 'cap', label: 'Capitals', hint: 'Centers the cap height. Best for Title Case and UPPERCASE labels.' },
    { value: 'x', label: 'Lowercase', hint: 'Centers the x-height. Best for all-lowercase labels.' },
  ];
  return (
    <div className="flex items-center gap-3">
      <span className="text-[13px] text-ink-500">Center on</span>
      <div role="radiogroup" aria-label="Center on" className="inline-flex rounded-full bg-ivory-200 p-0.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            title={option.hint}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-7 rounded-full px-3.5 text-[13px] transition-colors',
              value === option.value ? 'bg-white text-ink shadow-sm' : 'text-ink-500 hover:text-ink',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function toZipEntry(output: ReadyOutput): ZipEntry {
  return { name: output.filename, data: base64ToBytes(output.data) };
}

function dedupe(entries: ZipEntry[]) {
  const seen = new Map<string, number>();
  return entries.map((entry) => {
    const count = seen.get(entry.name) ?? 0;
    seen.set(entry.name, count + 1);
    return count === 0 ? entry : { ...entry, name: entry.name.replace(/(\.[^.]+)$/, ` (${count + 1})$1`) };
  });
}

function baseName(filename: string) {
  return filename.replace(/\.[^.]+$/, '');
}
