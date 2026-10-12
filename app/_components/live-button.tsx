import { cn } from '@/lib/cn';

interface LiveButtonProps {
  family?: string;
  text: string;
  variant: 'solid' | 'outline' | 'tag';
  /** Extra vertical shift in em, positive moves text up. Previews a nudge before it is applied. */
  shiftEm?: number;
  guide?: boolean;
}

/** A real button rendered by the browser with flexbox centering, optionally with a dashed center guide. */
export function LiveButton({ family, text, variant, shiftEm = 0, guide = true }: LiveButtonProps) {
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
      <span style={shiftEm ? { transform: `translateY(${-shiftEm}em)` } : undefined}>{text}</span>
      {guide && <span aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-clay" />}
    </span>
  );
}
