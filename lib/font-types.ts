// Shapes returned by fix_vertical_metrics.process() (Python), via /api/fix-font.

export type AlignTarget = 'cap' | 'x';
export type OutputFormat = 'woff2' | 'otf' | 'woff' | 'ttf';
export type PlatformKey = 'mac' | 'windows' | 'linux';

export interface LineMetrics {
  source: 'hhea' | 'typo' | 'win';
  ascent: number;
  descent: number; // negative, font units
  lineGap: number;
}

export interface FontAnalysis {
  names: { family: string; style: string; postscript: string };
  unitsPerEm: number;
  outline: 'TrueType' | 'CFF' | 'CFF2';
  variable: boolean;
  capHeight: number;
  xHeight: number;
  glyphBounds: { yMin: number; yMax: number };
  os2Version: number;
  tables: {
    hhea: { ascent: number; descent: number; lineGap: number };
    typo: { ascent: number; descent: number; lineGap: number; useTypoMetrics: boolean; flagSetButIgnored: boolean };
    win: { ascent: number; descent: number };
  };
  platforms: Record<PlatformKey, LineMetrics>;
}

export type FontOutput =
  | { filename: string; size: number; data: string; notes: string[] }
  | { error: string };

export interface FixResult {
  filename: string;
  align: AlignTarget;
  before: FontAnalysis;
  after: FontAnalysis;
  warnings: string[];
  outputs: Partial<Record<OutputFormat, FontOutput>>;
}

export const PLATFORMS: { key: PlatformKey; label: string; engines: string }[] = [
  { key: 'mac', label: 'macOS & iOS', engines: 'Safari, Chrome · Core Text' },
  { key: 'windows', label: 'Windows', engines: 'Chrome, Edge, Firefox · DirectWrite' },
  { key: 'linux', label: 'Android & Linux', engines: 'Chrome, Firefox · FreeType' },
];

export const FORMATS: Record<OutputFormat, { label: string; use: string; mime: string }> = {
  woff2: { label: '.woff2', use: 'Web', mime: 'font/woff2' },
  otf: { label: '.otf', use: 'Desktop', mime: 'font/otf' },
  woff: { label: '.woff', use: 'Web, legacy browsers', mime: 'font/woff' },
  ttf: { label: '.ttf', use: 'Desktop + web', mime: 'font/ttf' },
};

export const DEFAULT_FORMATS: OutputFormat[] = ['woff2', 'otf'];
