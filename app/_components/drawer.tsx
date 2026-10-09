'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

const TRANSITION_MS = 300;

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  onKeyDown?: (event: React.KeyboardEvent<HTMLDialogElement>) => void;
  children: React.ReactNode;
}

/**
 * Right-hand drawer built on the native <dialog>: showModal() provides focus trapping,
 * Escape handling, a backdrop and an inert page behind it without a UI library.
 * `data-state` drives the slide and backdrop fade so closing can animate before close().
 */
export function Drawer({ open, onClose, labelledBy, onKeyDown, children }: DrawerProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const root = document.documentElement;

    if (open && !dialog.open) {
      dialog.showModal();
      root.classList.add('overflow-hidden');
      const frame = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      return () => cancelAnimationFrame(frame);
    }
    if (!open && dialog.open) {
      setVisible(false);
      const timeout = setTimeout(() => {
        dialog.close();
        root.classList.remove('overflow-hidden');
      }, TRANSITION_MS);
      return () => clearTimeout(timeout);
    }
  }, [open]);

  useEffect(() => () => document.documentElement.classList.remove('overflow-hidden'), []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      data-state={visible ? 'open' : 'closed'}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose(); // click on the backdrop
      }}
      onKeyDown={onKeyDown}
      className={cn(
        'group/drawer m-0 ml-auto h-dvh max-h-none w-full max-w-none overflow-visible border-0 bg-transparent p-0 sm:w-[min(980px,94vw)]',
        'backdrop:bg-ink/0 backdrop:backdrop-blur-0 backdrop:transition-all backdrop:duration-300',
        'data-[state=open]:backdrop:bg-ink/25 data-[state=open]:backdrop:backdrop-blur-[2px]',
      )}
    >
      <div
        className={cn(
          'flex h-full translate-x-full flex-col bg-ivory shadow-[-24px_0_64px_-24px_rgba(20,20,19,0.25)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          'group-data-[state=open]/drawer:translate-x-0 sm:rounded-l-[28px] sm:border-l sm:border-ivory-300',
        )}
      >
        {children}
      </div>
    </dialog>
  );
}
