'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { ACCEPTED_EXTENSIONS } from '@/lib/fix-font-client';

interface DropZoneProps {
  onFiles: (files: File[]) => void;
  compact: boolean;
  children?: React.ReactNode;
}

/** Wraps the whole tool so fonts can be dropped anywhere on it. */
export function DropZone({ onFiles, compact, children }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);

  const browse = () => inputRef.current?.click();

  return (
    <div
      onDragEnter={(event) => {
        event.preventDefault();
        dragDepth.current += 1;
        setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => {
        dragDepth.current -= 1;
        if (dragDepth.current <= 0) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        onFiles(Array.from(event.dataTransfer.files));
      }}
      className="relative"
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_EXTENSIONS.join(',')}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          onFiles(Array.from(event.target.files ?? []));
          event.target.value = '';
        }}
      />

      {compact ? (
        <button
          type="button"
          onClick={browse}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-ink-200 py-3 text-sm text-ink-500 transition-colors hover:border-ink-400 hover:text-ink"
        >
          <span aria-hidden className="text-base leading-none">+</span> Add more fonts
          <span className="text-ink-400">or drop them anywhere here</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={browse}
          className={cn(
            'group flex w-full flex-col items-center justify-center gap-5 rounded-2xl border border-dashed px-6 py-14 text-center transition-colors sm:py-16',
            dragging ? 'border-clay bg-clay-light/40' : 'border-ink-200 hover:border-ink-400 hover:bg-ivory-100',
          )}
        >
          <GlyphMark />
          <span className="space-y-1.5">
            <span className="block font-serif text-2xl tracking-tight text-ink">Drop your font files here</span>
            <span className="block text-sm text-ink-500">
              or <span className="text-clay-dark underline decoration-clay/40 underline-offset-4 group-hover:decoration-clay">browse your computer</span>.
              Several at once is fine.
            </span>
          </span>
          <span className="font-mono text-[11px] uppercase tracking-wider text-ink-400">
            .ttf · .otf · .woff · .woff2 — up to 4 MB each
          </span>
        </button>
      )}

      {children}

      {dragging && compact && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl border-2 border-dashed border-clay bg-ivory/90">
          <span className="font-serif text-xl text-ink">Drop to add fonts</span>
        </div>
      )}
    </div>
  );
}

function GlyphMark() {
  return (
    <svg viewBox="0 0 88 56" className="h-14 w-[88px]" aria-hidden>
      <rect x="1" y="1" width="86" height="54" rx="27" fill="#fff" stroke="#d1cfc5" />
      <line x1="0" x2="88" y1="28" y2="28" stroke="#d97757" strokeDasharray="4 3" />
      <text x="44" y="38" textAnchor="middle" fontSize="28" fontFamily="Georgia, serif" fill="#141413">
        Aa
      </text>
    </svg>
  );
}
