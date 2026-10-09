import { AlignTarget, FontAnalysis, LineMetrics, PLATFORMS, PlatformKey } from './font-types';

export const REFERENCE_PX = 16;

/**
 * How far the reference glyphs (caps or x-height) sit from the center of the line box.
 * CSS centers the content area (ascent + |descent|) in the line box, so the baseline sits at
 * (L + ascent - |descent|) / 2 from the top. The glyph center is targetHeight / 2 above it.
 * Result is independent of line-height. Positive = text sits low, negative = text sits high.
 */
export function offsetUnits(metrics: LineMetrics, targetHeight: number) {
  return (metrics.ascent + metrics.descent - targetHeight) / 2;
}

export function targetHeight(analysis: FontAnalysis, align: AlignTarget) {
  return align === 'cap' ? analysis.capHeight : analysis.xHeight;
}

export function offsetPx(analysis: FontAnalysis, platform: PlatformKey, align: AlignTarget, fontSize = REFERENCE_PX) {
  const units = offsetUnits(analysis.platforms[platform], targetHeight(analysis, align));
  return (units / analysis.unitsPerEm) * fontSize;
}

export function describeOffset(px: number) {
  if (Math.abs(px) < 0.05) return 'centered';
  return `${Math.abs(px).toFixed(1)}px ${px > 0 ? 'low' : 'high'}`;
}

export function platformSpread(analysis: FontAnalysis, align: AlignTarget) {
  const values = PLATFORMS.map((p) => offsetPx(analysis, p.key, align));
  return Math.max(...values) - Math.min(...values);
}

export function lineHeightNormal(metrics: LineMetrics, upm: number) {
  return (metrics.ascent - metrics.descent + metrics.lineGap) / upm;
}

export interface Issue {
  severity: 'high' | 'medium' | 'info';
  text: string;
}

export function detectIssues(analysis: FontAnalysis, align: AlignTarget): Issue[] {
  const issues: Issue[] = [];
  const { tables, glyphBounds } = analysis;
  const ref = align === 'cap' ? 'Capitals' : 'Lowercase letters';

  // Group systems that share the same offset so identical findings read as one line.
  const groups = new Map<string, { px: number; labels: string[] }>();
  for (const platform of PLATFORMS) {
    const px = offsetPx(analysis, platform.key, align);
    if (Math.abs(px) < 0.25) continue;
    const key = describeOffset(px);
    const group = groups.get(key) ?? { px, labels: [] };
    group.labels.push(platform.label);
    groups.set(key, group);
  }
  for (const { px, labels } of Array.from(groups.values())) {
    const where = labels.length === PLATFORMS.length ? 'every system' : joinList(labels);
    issues.push({
      severity: Math.abs(px) >= 1 ? 'high' : 'medium',
      text: `${ref} sit ${describeOffset(px)} on ${where} at ${REFERENCE_PX}px, ${pct(px)} of the font size.`,
    });
  }

  const spread = platformSpread(analysis, align);
  if (spread >= 0.25) {
    issues.push({
      severity: 'high',
      text: `Systems disagree by ${spread.toFixed(1)}px at ${REFERENCE_PX}px, because they read different metric tables.`,
    });
  }
  if (tables.typo.flagSetButIgnored) {
    issues.push({
      severity: 'medium',
      text: `USE_TYPO_METRICS is set, but the OS/2 table is version ${analysis.os2Version}. Renderers ignore the flag below version 4.`,
    });
  } else if (!tables.typo.useTypoMetrics) {
    issues.push({
      severity: 'medium',
      text: 'USE_TYPO_METRICS is off, so Windows falls back to the usWin clipping metrics.',
    });
  }
  if (tables.hhea.ascent !== tables.typo.ascent || tables.hhea.descent !== tables.typo.descent) {
    issues.push({
      severity: 'medium',
      text: `hhea (${tables.hhea.ascent} / ${tables.hhea.descent}) and OS/2 typo (${tables.typo.ascent} / ${tables.typo.descent}) metrics do not match.`,
    });
  }
  if (tables.hhea.lineGap !== 0 || tables.typo.lineGap !== 0) {
    issues.push({ severity: 'info', text: 'Non-zero line gap makes line-height: normal differ between systems.' });
  }
  if (tables.win.ascent < glyphBounds.yMax || -tables.win.descent > -glyphBounds.yMin) {
    issues.push({ severity: 'medium', text: 'usWin metrics are smaller than the tallest glyphs, which clips them in Windows apps.' });
  }
  if (issues.length === 0) {
    issues.push({ severity: 'info', text: `Already well aligned. ${ref} sit within 0.25px of center everywhere.` });
  }
  return issues;
}

function joinList(items: string[]) {
  return items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function pct(px: number) {
  return `${((Math.abs(px) / REFERENCE_PX) * 100).toFixed(1)}%`;
}
