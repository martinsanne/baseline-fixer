# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

Web app and CLI that rewrite a font's vertical metrics so text is optically centered in its line box on macOS, Windows and Linux/Android. The README explains the font-metric background, including which table each platform reads.

## Commands

```bash
npm run dev                 # Next.js dev server (the user runs this themselves; don't start it in the background)
npm run build               # production build, also type-checks
npm run typecheck           # tsc --noEmit
python3 -m venv venv && venv/bin/pip install -r requirements.txt   # Python deps (fontTools, brotli)

venv/bin/python fix_vertical_metrics.py in.ttf out.woff2   # fix one font; format from the extension
venv/bin/python fix_vertical_metrics.py in.ttf --report    # per-platform offsets before and after
```

There is no test suite. Verify Python changes with `--report` on a real font, for example `test-fonts/original.woff2` (CFF, OS/2 v3) or `/System/Library/Fonts/Supplemental/Arial.ttf` (TrueType). `npm run lint` is not set up because ESLint is not installed.

The project uses npm (`package-lock.json`), not pnpm.

## Architecture

- **`fix_vertical_metrics.py`** is the single source of truth for font logic. Both backends import it, so put new logic here.
  - `analyze()` returns raw tables plus the metrics each platform actually uses (`platforms.mac|windows|linux`).
  - `fix_font()` applies the cap- or x-height-centered metrics.
  - `export()` serializes to woff2/otf/woff/ttf and converts outlines when needed: glyf to CFF for `.otf`, CFF to glyf via cu2qu for `.ttf`.
  - `process()` is the JSON-producing entry point.
  - `--json-stdin` mode reads `{filename, data(base64), align, formats}` from stdin.
- **Two backends, same route `/api/fix-font`, same contract.** Requests are multipart (`file`, `align`, `formats`). Responses are JSON (`FixResult` in `lib/font-types.ts`).
  - `api/fix-font.py` is the Vercel Python function. `vercel.json` adds `fix_vertical_metrics.py` via `includeFiles`.
  - `app/api/fix-font/route.ts` is for local dev. It spawns `venv/bin/python` (falling back to `python3`) with `--json-stdin`. Never build a shell string from user input.
- **Frontend** (`app/_components/`, client-side): `font-fixer.tsx` owns all state.
  - It queues jobs with concurrency 3 and tracks upload progress over XHR. Each job has a `run` counter so stale responses are ignored after a re-queue, for example when the align target changes.
  - It requests `woff2,otf` up front and fetches other formats on demand through `ensureOutput`.
  - It builds zips client-side with `lib/zip.ts`, a STORE-only writer, to avoid a dependency.
  - `batch-status.tsx` shows the total-progress bar while working and a solid olive "done" state when finished.
  - Clicking a finished font opens `report-drawer.tsx`, which shows `alignment-report.tsx` in a right-hand drawer with previous/next navigation and arrow keys. `drawer.tsx` is built on the native `<dialog>` with `showModal()` and needs no UI library. Its `data-state` attribute drives the slide animation.
- **Alignment math lives in `lib/alignment.ts`**: `offsetUnits = (ascent + descent − targetHeight) / 2`, where descent is negative and a positive result means the text sits low.
  - `alignment-cell.tsx` draws each simulated button as SVG, with the baseline computed from the same math. The preview is exact in any browser and does not depend on the viewer's OS.
  - Keep the TS math and the Python `_print_report` consistent.
- `app/renderer/page.tsx` is a manual test page that loads git-ignored files from `test-fonts/`.

## Conventions

- Tailwind with design tokens in `tailwind.config.js` (`ivory`, `ink`, `clay`, `olive`, `sky`). Fonts are Source Serif 4, Inter and JetBrains Mono, loaded with `next/font/google`. Use `cn()` from `lib/cn.ts`.
- Use named exports for components. Inline `style` is used only for runtime values such as progress width and dynamic font families.
- Python must stay compatible with Python 3.9, the Vercel runtime in `runtime.txt`. Local venv is 3.14.
