import { AlignmentCell } from './_components/alignment-cell';
import { FontFixer } from './_components/font-fixer';

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <a href="#" className="flex items-center gap-2.5 text-[15px] font-medium tracking-tight">
          <LogoMark />
          Vertical Metrics
        </a>
        <nav className="flex items-center gap-6 text-sm text-ink-500">
          <a href="#why" className="hover:text-ink">Why</a>
          <a href="#how" className="hover:text-ink">How it works</a>
          <a href="#cli" className="hidden hover:text-ink sm:inline">CLI</a>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 sm:px-8">
        <section className="max-w-3xl pb-10 pt-10 sm:pb-12 sm:pt-16">
          <h1 className="font-serif text-[44px] leading-[1.05] tracking-tightest sm:text-[64px]">
            Text that sits in the middle. On every system.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-500">
            Most fonts look slightly too high or too low inside buttons, and by a different amount on macOS, Windows and
            Android. Drop in your fonts to see the offset on each system, then download versions that center
            everywhere.
          </p>
        </section>

        <FontFixer />

        <Why />
        <How />
        <Cli />
      </main>

      <footer className="mx-auto mt-24 max-w-6xl border-t border-ivory-300 px-5 py-10 text-sm text-ink-400 sm:px-8">
        Built on{' '}
        <a href="https://github.com/fonttools/fonttools" className="underline decoration-ink-200 underline-offset-4 hover:text-ink">
          fontTools
        </a>
        . Background reading:{' '}
        <a
          href="https://www.maxkohler.com/posts/2022-02-19-fixing-vertical-metrics/"
          className="underline decoration-ink-200 underline-offset-4 hover:text-ink"
        >
          Max Kohler on fixing vertical metrics
        </a>
        .
      </footer>
    </div>
  );
}

// Illustrative metrics (1000 units/em, cap height 700), exaggerated so the offset is visible.
const EXAMPLE = {
  mac: { source: 'hhea' as const, ascent: 1100, descent: -200, lineGap: 0 },
  windows: { source: 'win' as const, ascent: 1000, descent: -420, lineGap: 0 },
  fixed: { source: 'typo' as const, ascent: 1000, descent: -300, lineGap: 0 },
};

function Why() {
  const cells = [
    { label: 'macOS reads hhea', note: 'Large ascender pushes the baseline down', metrics: EXAMPLE.mac, tone: 'before' as const },
    { label: 'Windows reads usWin', note: 'Deep descender pulls the text up', metrics: EXAMPLE.windows, tone: 'before' as const },
    { label: 'Refined: one set, balanced', note: 'Same result on every system', metrics: EXAMPLE.fixed, tone: 'after' as const },
  ];

  return (
    <section id="why" className="scroll-mt-8 border-t border-ivory-300 pt-20 mt-24">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-clay-dark">Why this exists</p>
          <h2 className="mt-4 font-serif text-4xl leading-tight tracking-tight">
            Fonts tell each operating system a different story about their height.
          </h2>
          <div className="mt-6 space-y-4 text-[17px] leading-relaxed text-ink-700">
            <p>
              Browsers do not center glyphs. They center the font&apos;s <em>content area</em>: the space between its
              declared ascender and descender. Text looks centered only when the space above the capitals matches the
              space below the baseline.
            </p>
            <p>
              A font stores those values three times, in the hhea, OS/2 typo and OS/2 win tables. macOS reads one
              set, Windows another, and Android and Linux a third, depending on a single flag. When the sets disagree,
              the same button label lands in a different spot on each system. Padding tweaks fixed for one system break
              another.
            </p>
            <p>
              This tool rewrites the metrics once, in the font file, so CSS centering just works.
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {cells.map((cell) => (
            <figure
              key={cell.label}
              className="grid grid-cols-[1fr_1.3fr] items-center gap-4 rounded-2xl border border-ivory-300 bg-white p-3 pl-5"
            >
              <figcaption>
                <p className="text-sm font-medium text-ink">{cell.label}</p>
                <p className="mt-1 text-[13px] text-ink-500">{cell.note}</p>
              </figcaption>
              <AlignmentCell
                metrics={cell.metrics}
                unitsPerEm={1000}
                targetHeight={700}
                fontFamily="Georgia, 'Times New Roman', serif"
                text="Button"
                tone={cell.tone}
              />
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function How() {
  const steps = [
    {
      title: 'Measure',
      body: 'Reads the real cap height and x-height from the H and x outlines, and the tallest and deepest glyphs.',
    },
    {
      title: 'Balance',
      body: 'Splits the current macOS line height so the space above the capitals equals the space below the baseline.',
    },
    {
      title: 'Unify',
      body: 'Writes identical values to hhea and OS/2 typo, sets line gaps to zero and turns on USE_TYPO_METRICS.',
    },
    {
      title: 'Protect',
      body: 'Sets the Windows win metrics to cover every glyph, so accents and descenders never clip in desktop apps.',
    },
  ];
  return (
    <section id="how" className="scroll-mt-8 pt-24">
      <p className="font-mono text-[11px] uppercase tracking-wider text-clay-dark">How it works</p>
      <h2 className="mt-4 max-w-2xl font-serif text-4xl leading-tight tracking-tight">Four changes to the font, nothing else.</h2>
      <ol className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <li key={step.title} className="rounded-2xl border border-ivory-300 bg-white p-6">
            <span className="font-mono text-xs text-ink-400">0{index + 1}</span>
            <h3 className="mt-6 font-serif text-xl">{step.title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-500">{step.body}</p>
          </li>
        ))}
      </ol>
      <p className="mt-6 max-w-3xl text-[15px] leading-relaxed text-ink-500">
        Glyph shapes, spacing, kerning and features stay untouched, and line-height: normal on macOS stays the same.
        The desktop .otf holds CFF outlines. TrueType sources are converted losslessly, which drops TrueType hinting.
      </p>
    </section>
  );
}

function Cli() {
  return (
    <section id="cli" className="scroll-mt-8 pt-24">
      <div className="grid gap-8 rounded-[28px] bg-ink p-8 text-ivory sm:p-12 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-clay">Command line</p>
          <h2 className="mt-4 font-serif text-3xl leading-tight tracking-tight">Same fix, in your build pipeline.</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-ivory/60">
            The output format follows the file extension. Add --report to print the offset on each system.
          </p>
        </div>
        <pre className="overflow-x-auto rounded-2xl bg-white/5 p-6 font-mono text-[13px] leading-7 text-ivory/90">
          <code>
            <span className="text-ivory/40"># install</span>
            {'\n'}pip install -r requirements.txt{'\n\n'}
            <span className="text-ivory/40"># fix and export</span>
            {'\n'}python fix_vertical_metrics.py in.ttf out.woff2
            {'\n'}python fix_vertical_metrics.py in.ttf out.otf --align x{'\n\n'}
            <span className="text-ivory/40"># analyze only</span>
            {'\n'}python fix_vertical_metrics.py in.ttf --report
          </code>
        </pre>
      </div>
    </section>
  );
}

function LogoMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
      <rect x="1" y="5" width="22" height="14" rx="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <line x1="0" x2="24" y1="12" y2="12" stroke="#d97757" strokeWidth="1.5" strokeDasharray="2 2" />
    </svg>
  );
}
