#!/usr/bin/env python3
"""
Watch a directory for .ttx file changes and compile them to .woff2 on save.

Usage:
    python scripts/ttx-to-woff2-watch.py [directory]
    # Default directory is test-fonts/ in the project root

Requires: fonttools, watchdog
    pip install fonttools watchdog
"""

import os
import subprocess
import sys
from pathlib import Path

from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# Project root (parent of scripts/)
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_WATCH_DIR = PROJECT_ROOT / "test-fonts"


class TTXToWoff2Handler(FileSystemEventHandler):
    """On .ttx save: compile to .woff2 with fonttools ttx."""

    def __init__(self, watch_dir: Path):
        self.watch_dir = Path(watch_dir)

    def on_modified(self, event):
        if event.is_directory:
            return
        path = Path(event.src_path)
        if path.suffix.lower() != ".ttx":
            return
        # Debounce: only react to the file we care about
        if path.parent.resolve() != self.watch_dir.resolve():
            # Allow subdirs
            try:
                path.relative_to(self.watch_dir)
            except ValueError:
                return
        self.compile_ttx(path)

    def compile_ttx(self, ttx_path: Path):
        ttx_path = ttx_path.resolve()
        if not ttx_path.exists() or ttx_path.suffix.lower() != ".ttx":
            return
        # ttx -f --flavor woff2 file.ttx → file.woff2 in same dir
        try:
            subprocess.run(
                [
                    sys.executable,
                    "-m",
                    "fontTools.ttx",
                    "-f",
                    "--flavor",
                    "woff2",
                    str(ttx_path),
                ],
                check=True,
                capture_output=True,
                text=True,
            )
            woff2_path = ttx_path.with_suffix(".woff2")
            print(f"✓ {ttx_path.name} → {woff2_path.name}")
        except subprocess.CalledProcessError as e:
            print(f"✗ {ttx_path.name}: {e.stderr or e}", file=sys.stderr)


def main():
    watch_dir = DEFAULT_WATCH_DIR
    if len(sys.argv) > 1:
        watch_dir = Path(sys.argv[1]).resolve()

    if not watch_dir.is_dir():
        watch_dir.mkdir(parents=True, exist_ok=True)
        print(f"Created {watch_dir}")

    handler = TTXToWoff2Handler(watch_dir)
    observer = Observer()
    observer.schedule(handler, str(watch_dir), recursive=True)
    observer.start()
    print(f"Watching for .ttx saves in {watch_dir} (compile → .woff2)")
    print("Save a .ttx file to generate its .woff2. Ctrl+C to stop.")
    try:
        while True:
            observer.join(timeout=1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()


if __name__ == "__main__":
    main()
