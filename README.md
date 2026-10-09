# Vertical Metrics

Fonts often sit too high or too low inside buttons, and by a different amount on macOS, Windows and Android. This web app and CLI rewrite a font's vertical metrics so text is optically centered in its line box on every system and in every browser engine.

## Why text misaligns

A font stores its ascender and descender three times. Each platform reads a different set:

| Table | Read by |
| --- | --- |
| `hhea` ascender / descender / lineGap | macOS and iOS (Core Text): Safari, Chrome |
| `OS/2` sTypo* | Windows (DirectWrite) and Linux/Android (FreeType), only when `USE_TYPO_METRICS` (fsSelection bit 7) is set and OS/2 is version 4+ |
| `OS/2` usWinAscent / usWinDescent | Windows when the flag is off. Also the clipping box in GDI desktop apps |

CSS centers the *content area* (ascent + descent) in the line box, not the glyphs. Capitals look centered only when `ascent − |descent| = capHeight`. For any metric set the offset is `(ascent − |descent| − capHeight) / 2` font units. A positive value means the text sits low. It does not depend on `line-height`.

## What the fix does

1. Measures the real cap height and x-height from the `H` and `x` outlines, and the real glyph extremes.
2. Keeps the total line height macOS uses today, so `line-height: normal` does not change for Mac users. It splits that total so the reference height is centered: `ascent = (total + capHeight) / 2`. Use `--align x` to center the x-height instead.
3. Writes identical values to `hhea` and `OS/2` typo, sets both line gaps to 0, and turns on `USE_TYPO_METRICS`. It bumps OS/2 to version 4 if needed, because older versions ignore the flag.
4. Sets `usWinAscent` and `usWinDescent` to cover the new metrics and every glyph, so nothing clips in Windows apps.

Glyph outlines, spacing, kerning and features are untouched.

## Output formats

| Format | Use | Notes |
| --- | --- | --- |
| `.woff2` | Web (default) | |
| `.otf` | Desktop (default) | TrueType sources are converted to CFF. Quadratic to cubic is lossless, but TrueType hinting is dropped. Variable TrueType fonts keep their TrueType outlines. |
| `.woff` | Web, legacy browsers | |
| `.ttf` | Desktop and web | CFF sources are converted with cu2qu, within 1 font unit. CFF2 variable fonts are not supported. |

## Web app

```bash
npm install
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
npm run dev            # http://localhost:3000
```

Drop one or more fonts. Each file shows its own progress, and a bar shows total progress. Every font gets a report with:

- the offset on each system before and after the fix,
- a simulated button per system with helper lines,
- live buttons rendered by your browser,
- a table of every changed metric.

Download each font as Web (`.woff2`), Desktop (`.otf`) or another format. Download all fonts at once as a `.zip`.

## CLI

```bash
source venv/bin/activate
python fix_vertical_metrics.py input.ttf output.woff2        # format follows the extension
python fix_vertical_metrics.py input.ttf output.otf --align x # center lowercase instead of capitals
python fix_vertical_metrics.py input.ttf --report            # print per-platform offsets only
```

## API

`POST /api/fix-font` takes `multipart/form-data` with these fields:

- `file`: the font.
- `align`: `cap` or `x`.
- `formats`: comma-separated output formats, for example `woff2,otf`.

It returns JSON with the before and after analysis, warnings, and base64 outputs. The 4 MB request limit matches Vercel.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md). On Vercel, `api/fix-font.py` serves the API. Locally, `app/api/fix-font/route.ts` spawns the Python script. Both use `fix_vertical_metrics.py`.

## Test fonts

`test-fonts/` holds local fonts (git-ignored) for the `/renderer` page. `scripts/ttx-to-woff2-watch.py` recompiles `.ttx` files to `.woff2` on save. See [test-fonts/README.md](./test-fonts/README.md).

## License

MIT
