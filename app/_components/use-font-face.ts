'use client';

import { useEffect, useState } from 'react';
import { base64ToBytes } from '@/lib/fix-font-client';

/** Registers a FontFace from a File or base64 data; returns whether it is ready to render. */
export function useFontFace(family: string, source: File | string | undefined) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!source) return;
    let cancelled = false;
    let face: FontFace | undefined;

    (async () => {
      const data = typeof source === 'string' ? base64ToBytes(source).buffer : await source.arrayBuffer();
      face = new FontFace(family, data as ArrayBuffer);
      await face.load();
      if (cancelled) return;
      document.fonts.add(face);
      setReady(true);
    })().catch(() => {
      if (!cancelled) setReady(false);
    });

    return () => {
      cancelled = true;
      if (face) document.fonts.delete(face);
      setReady(false);
    };
  }, [family, source]);

  return ready;
}

export function cssFontFamily(family: string) {
  return `"${family}", system-ui, sans-serif`;
}
