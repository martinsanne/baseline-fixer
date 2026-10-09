import { offsetUnits } from '@/lib/alignment';
import { cn } from '@/lib/cn';
import type { LineMetrics } from '@/lib/font-types';

// Simulates how a renderer lays out one line of text in a button: the content area
// (ascent + descent from the metrics that platform reads) is centered in the line box,
// and the text is drawn on the resulting baseline. SVG <text y> is the alphabetic
// baseline, so the drawing is exact regardless of which browser shows it.

const WIDTH = 360;
const FONT_SIZE = 40;
const LINE_HEIGHT = FONT_SIZE * 1.2;
const PAD_Y = 18;
const MARGIN = 14;
const BOX_HEIGHT = LINE_HEIGHT + PAD_Y * 2;
const HEIGHT = BOX_HEIGHT + MARGIN * 2;

interface AlignmentCellProps {
  metrics: LineMetrics;
  unitsPerEm: number;
  targetHeight: number;
  fontFamily: string;
  text: string;
  tone: 'before' | 'after';
  className?: string;
}

export function AlignmentCell({ metrics, unitsPerEm, targetHeight, fontFamily, text, tone, className }: AlignmentCellProps) {
  const scale = FONT_SIZE / unitsPerEm;
  const ascent = metrics.ascent * scale;
  const descent = -metrics.descent * scale;
  const boxTop = MARGIN;
  const contentTop = boxTop + PAD_Y;
  const baseline = contentTop + (LINE_HEIGHT - (ascent + descent)) / 2 + ascent;
  const refTop = baseline - targetHeight * scale;
  const boxCenter = boxTop + BOX_HEIGHT / 2;
  const glyphCenter = boxCenter + offsetUnits(metrics, targetHeight) * scale;
  const centered = Math.abs(glyphCenter - boxCenter) < 0.4;

  const guideX1 = 34;
  const guideX2 = WIDTH - 34;
  const offsetColor = centered ? '#788c5d' : '#c6613f';

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={cn('block h-auto w-full', className)}
      role="img"
      aria-label={`${text} rendered with ${metrics.source} metrics`}
    >
      <rect
        x={12}
        y={boxTop}
        width={WIDTH - 24}
        height={BOX_HEIGHT}
        rx={BOX_HEIGHT / 2}
        fill={tone === 'before' ? '#f0eee6' : '#ffffff'}
        stroke={tone === 'before' ? '#d1cfc5' : '#141413'}
        strokeWidth={1}
      />

      {/* reference lines: cap/x height and baseline */}
      <line x1={guideX1} x2={guideX2} y1={refTop} y2={refTop} stroke="#6a9bcc" strokeWidth={0.75} strokeDasharray="1 3" />
      <line x1={guideX1} x2={guideX2} y1={baseline} y2={baseline} stroke="#6a9bcc" strokeWidth={0.75} strokeDasharray="1 3" />

      <text
        x={WIDTH / 2}
        y={baseline}
        textAnchor="middle"
        fontSize={FONT_SIZE}
        fontFamily={fontFamily}
        fill="#141413"
      >
        {text}
      </text>

      {/* container center vs glyph center */}
      <line x1={4} x2={WIDTH - 4} y1={boxCenter} y2={boxCenter} stroke="#141413" strokeOpacity={0.45} strokeWidth={1} strokeDasharray="5 4" />
      <line x1={guideX1} x2={guideX2} y1={glyphCenter} y2={glyphCenter} stroke={offsetColor} strokeWidth={1.5} />

      {!centered && (
        <g stroke={offsetColor} strokeWidth={1.5}>
          <line x1={WIDTH - 22} x2={WIDTH - 22} y1={boxCenter} y2={glyphCenter} />
          <line x1={WIDTH - 27} x2={WIDTH - 17} y1={glyphCenter} y2={glyphCenter} />
          <line x1={WIDTH - 27} x2={WIDTH - 17} y1={boxCenter} y2={boxCenter} />
        </g>
      )}
    </svg>
  );
}

export function AlignmentLegend() {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-500">
      <li className="flex items-center gap-2">
        <span className="w-5 border-t border-dashed border-ink-400" aria-hidden /> Container center
      </li>
      <li className="flex items-center gap-2">
        <span className="w-5 border-t-2 border-clay-dark" aria-hidden /> Glyph center, off
      </li>
      <li className="flex items-center gap-2">
        <span className="w-5 border-t-2 border-olive" aria-hidden /> Glyph center, aligned
      </li>
      <li className="flex items-center gap-2">
        <span className="w-5 border-t border-dotted border-sky" aria-hidden /> Baseline and cap or x-height
      </li>
    </ul>
  );
}
