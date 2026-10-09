#!/usr/bin/env python3
"""
Fix vertical metrics so text sits optically centered in its line box on every
platform (macOS, Windows, Linux/Android) and in every browser engine.

Why fonts misalign
------------------
A font carries three competing sets of vertical metrics:

  * hhea ascender/descender/lineGap   -> read by Core Text (macOS, iOS)
  * OS/2 sTypo* ascender/descender/gap -> read on Windows and Linux, but only
                                          when USE_TYPO_METRICS (fsSelection
                                          bit 7) is set
  * OS/2 usWinAscent/usWinDescent     -> read on Windows when the bit is off;
                                          also the clipping box for GDI apps

CSS centers the *content area* (ascent + descent) inside the line box. Glyphs
look centered only when the gap above the cap height equals the gap below the
baseline, i.e. when  ascent - descent == capHeight . If the three metric sets
disagree, every platform positions the same text differently.

What the fix does
-----------------
1. Measures the real cap height (or x-height) from the glyph outlines.
2. Keeps the total line height macOS uses today (so `line-height: normal`
   does not change for Mac users) and splits it so the chosen reference
   height is centered: ascent = (total + capHeight) / 2.
3. Writes the same ascent/descent to hhea and OS/2 typo, sets both line gaps
   to 0 and turns on USE_TYPO_METRICS (bumping OS/2 to version 4 if needed).
4. Sets usWinAscent/usWinDescent to the larger of the new metrics and the
   glyph bounds, so nothing gets clipped in Windows desktop apps.

Usage
-----
    python fix_vertical_metrics.py input.ttf output.woff2
    python fix_vertical_metrics.py input.woff2 output.otf --align x
    python fix_vertical_metrics.py input.ttf --report          # analysis only
    python fix_vertical_metrics.py --json-stdin                # used by the web API
"""

from __future__ import annotations

import argparse
import base64
import io
import json
import os
import sys

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.reverseContourPen import ReverseContourPen
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont, newTable

USE_TYPO_METRICS = 1 << 7
ALIGN_TARGETS = ("cap", "x")
OUTPUT_FORMATS = ("woff2", "otf", "woff", "ttf")
TRUETYPE_ONLY_TABLES = ("glyf", "loca", "cvt ", "fpgm", "prep", "hdmx", "LTSH", "VDMX", "gasp")
MVAR_METRIC_TAGS = {"hasc", "hdsc", "hlgp", "hcla", "hcld"}


# --------------------------------------------------------------------------
# Measuring
# --------------------------------------------------------------------------

def _glyph_bounds(font: TTFont, char: str):
    cmap = font.getBestCmap() or {}
    glyph_name = cmap.get(ord(char))
    if glyph_name is None:
        return None
    glyph_set = font.getGlyphSet()
    pen = BoundsPen(glyph_set)
    glyph_set[glyph_name].draw(pen)
    return pen.bounds


def _reference_heights(font: TTFont) -> tuple[int, int]:
    """Cap height and x-height measured from 'H' and 'x', falling back to OS/2, then to typical ratios."""
    upm = font["head"].unitsPerEm
    os2 = font["OS/2"]

    def measured(char: str, os2_attr: str, ratio: float) -> int:
        bounds = _glyph_bounds(font, char)
        if bounds:
            return round(bounds[3])
        declared = getattr(os2, os2_attr, 0) or 0
        return declared if declared > 0 else round(upm * ratio)

    return measured("H", "sCapHeight", 0.7), measured("x", "sxHeight", 0.5)


def _font_y_bounds(font: TTFont) -> tuple[int, int]:
    """Real glyph extremes. head.yMin/yMax is often stale after manual edits, so measure."""
    glyph_set = font.getGlyphSet()
    pen = BoundsPen(glyph_set)
    for name in font.getGlyphOrder():
        glyph_set[name].draw(pen)
    if not pen.bounds:
        return font["head"].yMin, font["head"].yMax
    return round(pen.bounds[1]), round(pen.bounds[3])


def _metric_tables(font: TTFont) -> dict:
    hhea = font["hhea"]
    os2 = font["OS/2"]
    return {
        "hhea": {"ascent": hhea.ascent, "descent": -abs(hhea.descent), "lineGap": hhea.lineGap},
        "typo": {
            "ascent": os2.sTypoAscender,
            "descent": -abs(os2.sTypoDescender),
            "lineGap": os2.sTypoLineGap,
            "useTypoMetrics": bool(os2.fsSelection & USE_TYPO_METRICS) and os2.version >= 4,
            "flagSetButIgnored": bool(os2.fsSelection & USE_TYPO_METRICS) and os2.version < 4,
        },
        "win": {"ascent": os2.usWinAscent, "descent": -abs(os2.usWinDescent)},
    }


def _platform_metrics(tables: dict) -> dict:
    """Which ascent/descent each rendering stack actually uses for line layout."""
    hhea, typo, win = tables["hhea"], tables["typo"], tables["win"]
    use_typo = typo["useTypoMetrics"]

    def pick(source: str) -> dict:
        if source == "hhea":
            return {"source": "hhea", **{k: hhea[k] for k in ("ascent", "descent", "lineGap")}}
        if source == "typo":
            return {"source": "typo", **{k: typo[k] for k in ("ascent", "descent", "lineGap")}}
        # DirectWrite derives a line gap for win metrics from the hhea total.
        hhea_total = hhea["ascent"] - hhea["descent"] + hhea["lineGap"]
        win_total = win["ascent"] - win["descent"]
        return {"source": "win", "ascent": win["ascent"], "descent": win["descent"],
                "lineGap": max(0, hhea_total - win_total)}

    return {
        "mac": pick("hhea"),
        "windows": pick("typo" if use_typo else "win"),
        "linux": pick("typo" if use_typo else "hhea"),
    }


def _names(font: TTFont) -> dict:
    name = font["name"]
    family = name.getDebugName(16) or name.getDebugName(1) or "Unknown"
    style = name.getDebugName(17) or name.getDebugName(2) or "Regular"
    return {"family": family, "style": style, "postscript": name.getDebugName(6) or f"{family}-{style}".replace(" ", "")}


def _outline_format(font: TTFont) -> str:
    if "CFF2" in font:
        return "CFF2"
    if "CFF " in font:
        return "CFF"
    return "TrueType"


def analyze(font: TTFont) -> dict:
    if "OS/2" not in font or "hhea" not in font:
        raise ValueError("Font is missing the OS/2 or hhea table")
    cap_height, x_height = _reference_heights(font)
    y_min, y_max = _font_y_bounds(font)
    tables = _metric_tables(font)
    return {
        "names": _names(font),
        "unitsPerEm": font["head"].unitsPerEm,
        "outline": _outline_format(font),
        "variable": "fvar" in font,
        "capHeight": cap_height,
        "xHeight": x_height,
        "glyphBounds": {"yMin": y_min, "yMax": y_max},
        "os2Version": font["OS/2"].version,
        "tables": tables,
        "platforms": _platform_metrics(tables),
    }


# --------------------------------------------------------------------------
# Fixing
# --------------------------------------------------------------------------

def _total_line_height(tables: dict, upm: int) -> int:
    """Line height to preserve: what macOS renders today, unless that is broken."""
    for key in ("hhea", "typo", "win"):
        metrics = tables[key]
        total = metrics["ascent"] - metrics["descent"] + metrics.get("lineGap", 0)
        if total >= upm * 0.8:
            return total
    return round(upm * 1.2)


def _ensure_os2_v4(os2) -> None:
    """USE_TYPO_METRICS is only defined for OS/2 version 4+; older tables ignore it."""
    if os2.version >= 4:
        return
    defaults = {
        "ulCodePageRange1": 0, "ulCodePageRange2": 0,
        "sxHeight": 0, "sCapHeight": 0, "usDefaultChar": 0, "usBreakChar": 32, "usMaxContext": 0,
    }
    for attr, value in defaults.items():
        if not hasattr(os2, attr):
            setattr(os2, attr, value)
    os2.version = 4


def fix_font(font: TTFont, align: str = "cap") -> list[str]:
    """Rewrite vertical metrics in place. Returns warnings."""
    if align not in ALIGN_TARGETS:
        raise ValueError(f"align must be one of {ALIGN_TARGETS}")

    warnings = []
    upm = font["head"].unitsPerEm
    hhea, os2 = font["hhea"], font["OS/2"]
    cap_height, x_height = _reference_heights(font)
    target = cap_height if align == "cap" else x_height
    y_min, y_max = _font_y_bounds(font)

    total = _total_line_height(_metric_tables(font), upm)
    total = max(total, target + round(upm * 0.2))
    ascent = round((total + target) / 2)
    descent = ascent - total  # negative

    hhea.ascent, hhea.descent, hhea.lineGap = ascent, descent, 0
    _ensure_os2_v4(os2)
    os2.sTypoAscender, os2.sTypoDescender, os2.sTypoLineGap = ascent, descent, 0
    os2.fsSelection |= USE_TYPO_METRICS
    os2.usWinAscent = max(ascent, y_max, 0)
    os2.usWinDescent = max(-descent, -y_min, 0)
    if not os2.sCapHeight:
        os2.sCapHeight = cap_height
    if not os2.sxHeight:
        os2.sxHeight = x_height

    if "MVAR" in font:
        tags = {rec.ValueTag for rec in font["MVAR"].table.ValueRecord or []}
        if tags & MVAR_METRIC_TAGS:
            warnings.append(
                "Variable font: MVAR varies line metrics across the design space, "
                "so alignment is exact at the default instance only."
            )
    return warnings


# --------------------------------------------------------------------------
# Format conversion
# --------------------------------------------------------------------------

def _truetype_to_cff(font: TTFont) -> None:
    """Quadratic -> cubic is lossless; TrueType hinting is dropped."""
    from fontTools.fontBuilder import FontBuilder

    glyph_order = font.getGlyphOrder()
    glyph_set = font.getGlyphSet()
    hmtx = font["hmtx"]
    char_strings = {}
    for name in glyph_order:
        pen = T2CharStringPen(width=hmtx[name][0], glyphSet=glyph_set)
        glyph_set[name].draw(ReverseContourPen(pen))  # CFF winds counter-clockwise
        char_strings[name] = pen.getCharString()

    names = _names(font)
    name_table = font["name"]
    for tag in TRUETYPE_ONLY_TABLES:
        if tag in font:
            del font[tag]

    builder = FontBuilder(font=font)
    builder.isTTF = False
    builder.setupCFF(
        names["postscript"],
        {
            "FullName": name_table.getDebugName(4) or names["postscript"],
            "FamilyName": names["family"],
            "Weight": names["style"],
        },
        char_strings,
        {},
    )
    maxp = font["maxp"]
    maxp.tableVersion = 0x00005000
    for attr in list(vars(maxp)):
        if attr not in ("tableTag", "tableVersion", "numGlyphs"):
            delattr(maxp, attr)
    font["post"].formatType = 3.0


def _cff_to_truetype(font: TTFont) -> None:
    """Cubic -> quadratic approximation within 1 font unit."""
    glyph_order = font.getGlyphOrder()
    glyph_set = font.getGlyphSet()
    glyphs = {}
    for name in glyph_order:
        tt_pen = TTGlyphPen(glyph_set)
        glyph_set[name].draw(Cu2QuPen(tt_pen, max_err=1.0, reverse_direction=True))
        glyphs[name] = tt_pen.glyph()

    font["loca"] = newTable("loca")
    font["glyf"] = glyf = newTable("glyf")
    glyf.glyphOrder = glyph_order
    glyf.glyphs = glyphs
    for tag in ("CFF ", "VORG"):
        if tag in font:
            del font[tag]
    glyf.compile(font)

    hmtx = font["hmtx"]
    for name, glyph in glyf.glyphs.items():
        if hasattr(glyph, "xMin"):
            hmtx[name] = (hmtx[name][0], glyph.xMin)

    font["maxp"] = maxp = newTable("maxp")
    maxp.tableVersion = 0x00010000
    for attr in ("maxZones",):
        setattr(maxp, attr, 1)
    for attr in ("maxTwilightPoints", "maxStorage", "maxFunctionDefs", "maxInstructionDefs",
                 "maxStackElements", "maxSizeOfInstructions"):
        setattr(maxp, attr, 0)
    maxp.maxComponentElements = max(
        (len(getattr(g, "components", []) or []) for g in glyphs.values()), default=0
    )
    maxp.compile(font)

    post = font["post"]
    post.formatType = 2.0
    post.extraNames = []
    post.mapping = {}
    post.glyphOrder = glyph_order
    font.sfntVersion = "\x00\x01\x00\x00"


def export(sfnt_bytes: bytes, fmt: str) -> tuple[bytes, list[str]]:
    """Serialize a fixed font (plain sfnt bytes) to the requested output format."""
    if fmt not in OUTPUT_FORMATS:
        raise ValueError(f"Unsupported format: {fmt}")
    font = TTFont(io.BytesIO(sfnt_bytes))
    outline = _outline_format(font)
    notes = []

    if fmt == "otf" and outline == "TrueType":
        if "gvar" in font:
            notes.append("Variable TrueType font kept its TrueType outlines inside the .otf file.")
        else:
            _truetype_to_cff(font)
            notes.append("Converted TrueType outlines to CFF. TrueType hinting was dropped.")
    elif fmt == "ttf" and outline != "TrueType":
        if outline == "CFF2":
            raise ValueError("Variable CFF2 fonts cannot be converted to .ttf")
        _cff_to_truetype(font)
        notes.append("Converted CFF outlines to TrueType (within 1 font unit).")

    font.flavor = fmt if fmt in ("woff", "woff2") else None
    out = io.BytesIO()
    font.save(out)
    return out.getvalue(), notes


# --------------------------------------------------------------------------
# Entry points
# --------------------------------------------------------------------------

def output_filename(filename: str, fmt: str) -> str:
    base = os.path.splitext(os.path.basename(filename))[0] or "font"
    return f"{base}-aligned.{fmt}"


def process(data: bytes, filename: str, align: str = "cap", formats=("woff2",)) -> dict:
    """Analyze, fix and export a font. Returns a JSON-serializable dict."""
    font = TTFont(io.BytesIO(data), lazy=False)
    before = analyze(font)
    warnings = fix_font(font, align)
    font.flavor = None
    sfnt = io.BytesIO()
    font.save(sfnt)
    fixed = TTFont(io.BytesIO(sfnt.getvalue()))
    after = analyze(fixed)

    outputs = {}
    for fmt in formats:
        try:
            out, notes = export(sfnt.getvalue(), fmt)
            outputs[fmt] = {
                "filename": output_filename(filename, fmt),
                "size": len(out),
                "data": base64.b64encode(out).decode("ascii"),
                "notes": notes,
            }
        except Exception as exc:  # one failing format must not lose the others
            outputs[fmt] = {"error": str(exc)}

    return {
        "filename": filename,
        "align": align,
        "before": before,
        "after": after,
        "warnings": warnings,
        "outputs": outputs,
    }


def parse_formats(raw) -> list[str]:
    if isinstance(raw, str):
        raw = raw.split(",")
    formats = [f.strip().lower() for f in (raw or []) if f and f.strip()]
    formats = [f for f in formats if f in OUTPUT_FORMATS]
    return formats or ["woff2"]


def _run_json_stdin() -> int:
    """Read {filename, data(base64), align, formats} on stdin, write the result JSON to stdout."""
    try:
        request = json.load(sys.stdin)
        result = process(
            base64.b64decode(request["data"]),
            request.get("filename") or "font.ttf",
            request.get("align") or "cap",
            parse_formats(request.get("formats")),
        )
        json.dump(result, sys.stdout)
        return 0
    except Exception as exc:
        json.dump({"error": str(exc)}, sys.stdout)
        return 1


def _print_report(result: dict) -> None:
    def offset(metrics: dict, target: int, upm: int) -> str:
        units = (metrics["ascent"] + metrics["descent"] - target) / 2
        if abs(units) < 0.5:
            return f"centered ({metrics['source']})"
        direction = "low" if units > 0 else "high"
        return f"{abs(units) / upm * 16:.2f}px {direction} @16px ({metrics['source']})"

    before, after = result["before"], result["after"]
    key = "capHeight" if result["align"] == "cap" else "xHeight"
    print(f"{before['names']['family']} {before['names']['style']} ({before['outline']}, {before['unitsPerEm']} upm)")
    for platform in ("mac", "windows", "linux"):
        print(f"  {platform:8} before: {offset(before['platforms'][platform], before[key], before['unitsPerEm'])}")
        print(f"  {'':8} after:  {offset(after['platforms'][platform], after[key], after['unitsPerEm'])}")
    for warning in result["warnings"]:
        print(f"  ! {warning}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Center text vertically on every platform by fixing font vertical metrics.")
    parser.add_argument("input", nargs="?", help="Input font (.ttf, .otf, .woff, .woff2)")
    parser.add_argument("output", nargs="?", help="Output path; format from extension (.woff2, .otf, .woff, .ttf)")
    parser.add_argument("--align", choices=ALIGN_TARGETS, default="cap", help="Center capitals (default) or lowercase x-height")
    parser.add_argument("--flavor", choices=OUTPUT_FORMATS, help="Override output format (legacy option)")
    parser.add_argument("--report", action="store_true", help="Print per-platform offsets before and after")
    parser.add_argument("--json-stdin", action="store_true", help=argparse.SUPPRESS)
    args = parser.parse_args()

    if args.json_stdin:
        return _run_json_stdin()
    if not args.input or (not args.output and not args.report):
        parser.error("input and output are required (or use --report)")

    with open(args.input, "rb") as handle:
        data = handle.read()

    formats = []
    if args.output:
        fmt = args.flavor or os.path.splitext(args.output)[1].lstrip(".").lower()
        if fmt not in OUTPUT_FORMATS:
            parser.error(f"cannot infer format from '{args.output}'; use one of {OUTPUT_FORMATS}")
        formats = [fmt]

    try:
        result = process(data, os.path.basename(args.input), args.align, formats or ["woff2"])
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    if args.output:
        output = result["outputs"][formats[0]]
        if "error" in output:
            print(f"Error: {output['error']}", file=sys.stderr)
            return 1
        with open(args.output, "wb") as handle:
            handle.write(base64.b64decode(output["data"]))
        print(f"Wrote {args.output}")
        for note in output["notes"]:
            print(f"  - {note}")
    if args.report or args.output:
        _print_report(result)
    return 0


if __name__ == "__main__":
    sys.exit(main())
