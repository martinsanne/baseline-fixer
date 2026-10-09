'use client';

import { useEffect, useState } from 'react';
import {
  describeOffset,
  detectIssues,
  lineHeightNormal,
  offsetPx,
  platformSpread,
  REFERENCE_PX,
  targetHeight,
} from '@/lib/alignment';
import { cn } from '@/lib/cn';
import { PLATFORMS, type FixResult, type FontAnalysis, type PlatformKey } from '@/lib/font-types';
import { AlignmentCell, AlignmentLegend } from './alignment-cell';
import type { Job } from './font-fixer';
import { cssFontFamily, useFontFace } from './use-font-face';

export function AlignmentReport({ job }: { job: Job & { result: FixResult } }) {
  const { result } = job;
  const [text, setText] = useState(result.align === 'cap' ? 'Get Started' : 'get started');
  const inputFamily = `vm-in-${job.id}`;
  const outputFamily = `vm-out-${job.id}`;
  const woff2 = result.outputs.woff2;
  const inputReady = useFontFace(inputFamily, job.file);
  const outputReady = useFontFace(outputFamily, woff2 && 'data' in woff2 ? woff2.data : undefined);
  const outputName = woff2 && 'filename' in woff2 ? woff2.filename : 'refined font';

  return (
    <article className="space-y-10" aria-label={`Alignment report for ${job.file.name}`}>
      <Summary result={result} />

      <section className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="font-serif text-2xl tracking-tight">Before and after, per system</h3>
            <p className="mt-1 max-w-xl text-sm text-ink-500">
              Each button is drawn with the exact metrics that system reads from the font. Glyph shapes are identical.
              Only the position changes.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-500">
            Sample
            <input
              value={text}
              maxLength={18}
              onChange={(event) => setText(event.target.value)}
              className="h-9 w-40 rounded-full border border-ink-200 bg-white px-3.5 text-ink outline-none focus:border-ink-400"
            />
          </label>
        </div>

        <div className={cn('overflow-hidden rounded-2xl border border-ivory-300 bg-white transition-opacity', !inputReady && 'opacity-60')}>
          <div className="grid grid-cols-2 border-b border-ivory-300 md:grid-cols-[180px_1fr_1fr]">
            <div className="hidden md:block" />
            <ColumnHeading tone="before" title="Input" file={job.file.name} />
            <ColumnHeading tone="after" title="Refined output" file={outputName} />
          </div>
          {PLATFORMS.map((platform) => (
            <PlatformRow
              key={platform.key}
              platform={platform}
              result={result}
              fontFamily={cssFontFamily(inputFamily)}
              text={text || ' '}
            />
          ))}
        </div>
        <AlignmentLegend />
      </section>

      <LiveComparison
        text={text || ' '}
        inputFamily={inputReady ? cssFontFamily(inputFamily) : undefined}
        outputFamily={outputReady ? cssFontFamily(outputFamily) : undefined}
      />

      <MetricChanges before={result.before} after={result.after} />

      {(result.warnings.length > 0 || hasNotes(result)) && (
        <section className="space-y-2 text-sm text-ink-500">
          {result.warnings.map((warning) => (
            <p key={warning}>⚠︎ {warning}</p>
          ))}
          {Object.values(result.outputs).flatMap((output) =>
            output && 'notes' in output ? output.notes.map((note) => <p key={output.filename + note}>{output.filename}: {note}</p>) : [],
          )}
        </section>
      )}
    </article>
  );
}

function hasNotes(result: FixResult) {
  return Object.values(result.outputs).some((output) => output && 'notes' in output && output.notes.length > 0);
}

function Summary({ result }: { result: FixResult }) {
  const { before, after, align } = result;
  const ref = align === 'cap' ? 'Capitals' : 'Lowercase letters';
  const worst = Math.max(...PLATFORMS.map((p) => Math.abs(offsetPx(before, p.key, align))));
  const spread = platformSpread(before, align);
  const afterWorst = Math.max(...PLATFORMS.map((p) => Math.abs(offsetPx(after, p.key, align))));
  const issues = detectIssues(before, align);

  const headline =
    worst < 0.25 && spread < 0.25
      ? `${ref} were already within a quarter pixel of center. The refined file still makes every system read the same metrics.`
      : `${ref} sat up to ${worst.toFixed(1)}px off-center at ${REFERENCE_PX}px${
          spread >= 0.25 ? `, and systems disagreed by ${spread.toFixed(1)}px` : ', the same on every system'
        }. The refined font ${afterWorst < 0.05 ? 'centers them exactly' : `keeps them within ${afterWorst.toFixed(2)}px`} everywhere.`;

  return (
    <section className="space-y-8">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-wider text-ink-400">
          {before.outline}
          {before.variable ? ' · variable' : ''} · {before.unitsPerEm} units/em
        </p>
        <h2 className="mt-3 max-w-3xl font-serif text-[28px] leading-snug tracking-tight sm:text-[32px]">{headline}</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {PLATFORMS.map((platform) => (
          <StatTile key={platform.key} platform={platform.key} label={platform.label} result={result} />
        ))}
      </div>

      <div>
        <h3 className="text-sm font-medium text-ink">What we found in the input</h3>
        <ul className="mt-3 space-y-2">
          {issues.map((issue) => (
            <li key={issue.text} className="flex gap-3 text-[15px] leading-relaxed text-ink-700">
              <span
                className={cn(
                  'mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full',
                  issue.severity === 'high' ? 'bg-clay-dark' : issue.severity === 'medium' ? 'bg-clay/60' : 'bg-ink-300',
                )}
                aria-hidden
              />
              {issue.text}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function StatTile({ platform, label, result }: { platform: PlatformKey; label: string; result: FixResult }) {
  const before = offsetPx(result.before, platform, result.align);
  const after = offsetPx(result.after, platform, result.align);
  return (
    <div className="rounded-2xl border border-ivory-300 bg-white p-4">
      <p className="text-[13px] text-ink-500">{label}</p>
      <p className="mt-2 flex items-baseline gap-2">
        <span className={cn('font-serif text-2xl tracking-tight', Math.abs(before) >= 0.25 ? 'text-clay-dark' : 'text-ink')}>
          {describeOffset(before)}
        </span>
        <span className="text-ink-300" aria-hidden>→</span>
        <span className="font-serif text-2xl tracking-tight text-olive">{describeOffset(after)}</span>
      </p>
      <p className="mt-1 font-mono text-[11px] text-ink-400">
        reads {result.before.platforms[platform].source} → {result.after.platforms[platform].source} · at {REFERENCE_PX}px
      </p>
    </div>
  );
}

function ColumnHeading({ tone, title, file }: { tone: 'before' | 'after'; title: string; file: string }) {
  return (
    <div className={cn('px-4 py-3', tone === 'before' ? 'bg-ivory-100' : 'bg-white')}>
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider',
          tone === 'before' ? 'bg-ivory-300 text-ink-500' : 'bg-olive-light text-olive',
        )}
      >
        <span className={cn('h-1.5 w-1.5 rounded-full', tone === 'before' ? 'bg-ink-400' : 'bg-olive')} aria-hidden />
        {title}
      </span>
      <p className="mt-1.5 truncate font-mono text-[11px] text-ink-400">{file}</p>
    </div>
  );
}

function PlatformRow({
  platform,
  result,
  fontFamily,
  text,
}: {
  platform: (typeof PLATFORMS)[number];
  result: FixResult;
  fontFamily: string;
  text: string;
}) {
  const cell = (analysis: FontAnalysis, tone: 'before' | 'after') => {
    const px = offsetPx(analysis, platform.key, result.align);
    return (
      <div className={cn('px-3 py-3 sm:px-4', tone === 'before' ? 'bg-ivory-100' : 'bg-white')}>
        <AlignmentCell
          metrics={analysis.platforms[platform.key]}
          unitsPerEm={analysis.unitsPerEm}
          targetHeight={targetHeight(analysis, result.align)}
          fontFamily={fontFamily}
          text={text}
          tone={tone}
        />
        <p className={cn('mt-1 text-center font-mono text-[11px]', Math.abs(px) >= 0.25 ? 'text-clay-dark' : 'text-olive')}>
          {describeOffset(px)} at {REFERENCE_PX}px · {analysis.platforms[platform.key].source}
        </p>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-2 border-b border-ivory-300 last:border-b-0 md:grid-cols-[180px_1fr_1fr]">
      <div className="col-span-2 flex items-baseline gap-2 px-4 pt-3 md:col-span-1 md:block md:py-5">
        <p className="text-sm font-medium text-ink">{platform.label}</p>
        <p className="text-[12px] text-ink-400 md:mt-1">{platform.engines}</p>
      </div>
      {cell(result.before, 'before')}
      {cell(result.after, 'after')}
    </div>
  );
}

function LiveComparison({ text, inputFamily, outputFamily }: { text: string; inputFamily?: string; outputFamily?: string }) {
  const [system, setSystem] = useState('this system');
  useEffect(() => {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|Mac/.test(ua)) setSystem('macOS & iOS');
    else if (/Windows/.test(ua)) setSystem('Windows');
    else if (/Android|Linux/.test(ua)) setSystem('Android & Linux');
  }, []);

  return (
    <section className="space-y-4">
      <div>
        <h3 className="font-serif text-2xl tracking-tight">Live in your browser</h3>
        <p className="mt-1 max-w-xl text-sm text-ink-500">
          Real buttons rendered by your browser on {system}, with flexbox centering. The dashed line marks the exact middle.
          Open this page on another system to compare.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { label: 'Input', family: inputFamily, tone: 'before' as const },
          { label: 'Refined output', family: outputFamily, tone: 'after' as const },
        ].map(({ label, family, tone }) => (
          <div
            key={label}
            className={cn('flex flex-col items-center gap-4 rounded-2xl border border-ivory-300 p-6', tone === 'before' ? 'bg-ivory-100' : 'bg-white')}
          >
            <span className="text-[11px] font-medium uppercase tracking-wider text-ink-400">{label}</span>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <LiveButton family={family} variant="solid" text={text} />
              <LiveButton family={family} variant="outline" text={text} />
              <LiveButton family={family} variant="tag" text={text.toUpperCase()} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function LiveButton({ family, text, variant }: { family?: string; text: string; variant: 'solid' | 'outline' | 'tag' }) {
  return (
    <span
      className={cn(
        'relative inline-flex items-center justify-center whitespace-nowrap leading-none',
        variant === 'solid' && 'h-12 rounded-full bg-ink px-6 text-[20px] text-ivory',
        variant === 'outline' && 'h-12 rounded-lg border border-ink px-5 text-[20px]',
        variant === 'tag' && 'h-7 rounded-md bg-clay-light px-2.5 text-[13px] tracking-wide text-ink',
        !family && 'opacity-40',
      )}
      style={family ? { fontFamily: family } : undefined}
    >
      {text}
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-clay" />
    </span>
  );
}

function MetricChanges({ before, after }: { before: FontAnalysis; after: FontAnalysis }) {
  const rows: [string, string | number, string | number][] = [
    ['hhea ascender / descender', pair(before.tables.hhea), pair(after.tables.hhea)],
    ['hhea line gap', before.tables.hhea.lineGap, after.tables.hhea.lineGap],
    ['OS/2 typo ascender / descender', pair(before.tables.typo), pair(after.tables.typo)],
    ['OS/2 typo line gap', before.tables.typo.lineGap, after.tables.typo.lineGap],
    ['OS/2 usWin ascent / descent', pair(before.tables.win), pair(after.tables.win)],
    ['USE_TYPO_METRICS', flag(before), flag(after)],
    ['OS/2 version', before.os2Version, after.os2Version],
    ...PLATFORMS.map(
      (p) =>
        [
          `line-height: normal on ${p.label}`,
          lineHeightNormal(before.platforms[p.key], before.unitsPerEm).toFixed(3),
          lineHeightNormal(after.platforms[p.key], after.unitsPerEm).toFixed(3),
        ] as [string, string, string],
    ),
    ['Cap height / x-height (measured)', `${before.capHeight} / ${before.xHeight}`, `${after.capHeight} / ${after.xHeight}`],
  ];

  return (
    <details className="group rounded-2xl border border-ivory-300 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-medium">
        Metric changes, table by table
        <span className="text-ink-400 transition-transform group-open:rotate-45" aria-hidden>
          +
        </span>
      </summary>
      <div className="overflow-x-auto border-t border-ivory-300">
        <table className="w-full text-left text-sm">
          <thead className="text-[11px] uppercase tracking-wider text-ink-400">
            <tr>
              <th className="px-5 py-2.5 font-medium">Value</th>
              <th className="px-5 py-2.5 font-medium">Input</th>
              <th className="px-5 py-2.5 font-medium">Refined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ivory-200 font-mono text-[13px]">
            {rows.map(([label, from, to]) => (
              <tr key={label}>
                <td className="px-5 py-2 font-sans text-ink-700">{label}</td>
                <td className="px-5 py-2 text-ink-500">{from}</td>
                <td className={cn('px-5 py-2', String(from) !== String(to) ? 'text-ink' : 'text-ink-400')}>{to}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function pair(metrics: { ascent: number; descent: number }) {
  return `${metrics.ascent} / ${metrics.descent}`;
}

function flag(analysis: FontAnalysis) {
  if (analysis.tables.typo.flagSetButIgnored) return 'set, ignored (OS/2 < v4)';
  return analysis.tables.typo.useTypoMetrics ? 'on' : 'off';
}
