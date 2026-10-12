'use client';

import { useState } from 'react';
import { describeNudge, REFERENCE_PX } from '@/lib/alignment';
import { cn } from '@/lib/cn';
import { Spinner } from './download-controls';
import { LiveButton } from './live-button';

// Slider range in 1/1000 em. The API accepts up to ±100; optical corrections stay well inside ±50.
const RANGE = 50;

interface FineTuneProps {
  /** Nudge baked into the current refined output, in 1/1000 em. */
  applied: number;
  /** Refined output font, ready to render; undefined while it loads. */
  family?: string;
  text: string;
  busy: boolean;
  onApply: (nudge: number) => void;
}

/** Optional by-eye correction: previews a nudge on the refined font, then reprocesses with it. */
export function FineTune({ applied, family, text, busy, onApply }: FineTuneProps) {
  const [draft, setDraft] = useState(applied);
  const step = (delta: number) => setDraft((value) => clamp(value + delta));
  const shiftEm = (draft - applied) / 1000;

  return (
    <details className="group rounded-2xl border border-ivory-300 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-medium">
        <span>
          Fine-tune by eye <span className="ml-1 font-normal text-ink-400">Advanced · optional</span>
        </span>
        <span className="text-ink-400 transition-transform group-open:rotate-45" aria-hidden>
          +
        </span>
      </summary>

      <div className="space-y-5 border-t border-ivory-300 px-5 py-5">
        <p className="max-w-xl text-sm text-ink-500">
          Exactly centered text can look slightly low, because the eye weighs the top of letters more. If it does, lift it
          here. Most fonts need nothing. The nudge is written into the font, so it is the same on every system.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 rounded-xl bg-ivory-100 px-4 py-8">
          <LiveButton family={family} variant="solid" text={text} shiftEm={shiftEm} guide={false} />
          <LiveButton family={family} variant="outline" text={text} shiftEm={shiftEm} guide={false} />
          <LiveButton family={family} variant="tag" text={text.toUpperCase()} shiftEm={shiftEm} guide={false} />
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2">
            <StepButton label="Move text down" onClick={() => step(-1)} disabled={draft <= -RANGE}>
              <path d="M8 3v10m0 0-4-4m4 4 4-4" />
            </StepButton>
            <input
              type="range"
              min={-RANGE}
              max={RANGE}
              step={1}
              value={draft}
              onChange={(event) => setDraft(Number(event.target.value))}
              aria-label="Vertical nudge"
              aria-valuetext={describeNudge(draft)}
              className="min-w-0 flex-1 accent-ink"
            />
            <StepButton label="Move text up" onClick={() => step(1)} disabled={draft >= RANGE}>
              <path d="M8 13V3m0 0L4 7m4-4 4 4" />
            </StepButton>
          </div>
          <p className="w-44 shrink-0 font-mono text-[12px] text-ink-500 sm:text-right">
            {describeNudge(draft)}
            {draft !== 0 && ` at ${REFERENCE_PX}px`}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setDraft(0)}
            disabled={draft === 0 || busy}
            className="h-8 rounded-full px-3.5 text-[13px] text-ink-500 hover:text-ink disabled:opacity-40"
          >
            Reset to center
          </button>
          <button
            type="button"
            onClick={() => onApply(draft)}
            disabled={draft === applied || busy}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[13px] font-medium text-ivory transition-colors',
              'hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {busy && <Spinner />}
            {busy ? 'Applying…' : 'Apply to font'}
          </button>
        </div>
      </div>
    </details>
  );
}

function clamp(value: number) {
  return Math.max(-RANGE, Math.min(RANGE, value));
}

function StepButton({
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
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ink-200 text-ink-500 hover:border-ink-400 hover:text-ink disabled:opacity-40"
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {children}
      </svg>
    </button>
  );
}
