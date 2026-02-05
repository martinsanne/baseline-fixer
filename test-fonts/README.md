# Test fonts

Put `.ttx` (font XML) files here. With the watcher running, saving a TTX file will automatically compile it to `.woff2` in the same directory.

## Auto-compile TTX → WOFF2 on save

1. Install the watcher dependency (if not already):
   ```bash
   pip install watchdog
   # or from project root:
   pip install -r requirements.txt
   ```

2. From the project root, start the watcher:
   ```bash
   python scripts/ttx-to-woff2-watch.py
   ```
   Or watch a different directory:
   ```bash
   python scripts/ttx-to-woff2-watch.py /path/to/other/fonts
   ```

3. Edit or add a `.ttx` file in `test-fonts/` and save. The script will run:
   ```bash
   ttx -f --flavor woff2 yourfile.ttx
   ```
   and produce `yourfile.woff2` in the same folder.

Stop the watcher with `Ctrl+C`.

## Getting TTX files

- Export from font tools (FontForge, Glyphs, etc.) as TTX, or
- Disassemble an existing font:
  ```bash
  ttx -f yourfont.ttf
  ```
  This creates `yourfont.ttx` in the current directory.
