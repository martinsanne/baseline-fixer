#!/usr/bin/env python3
"""
Fix vertical metrics in font files.

Based on: https://www.maxkohler.com/posts/2022-02-19-fixing-vertical-metrics/

Usage:
    python fix_vertical_metrics.py input.ttf output.ttf
    python fix_vertical_metrics.py input.ttf output.woff --flavor woff
    python fix_vertical_metrics.py input.ttf output.woff2 --flavor woff2
"""

import sys
import argparse
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables import _h_m_t_x
import os


def get_font_bbox(font):
    """
    Get the font bounding box (xMin, yMin, xMax, yMax) from glyph outlines.
    Falls back to head table if no glyph bounds.
    """
    xmin = None
    ymin = None
    xmax = None
    ymax = None

    if 'glyf' in font:
        for glyph_name in font.getGlyphSet().keys():
            glyph = font['glyf'][glyph_name]
            if glyph and hasattr(glyph, 'xMin'):
                if xmin is None or glyph.xMin < xmin:
                    xmin = glyph.xMin
                if xmax is None or glyph.xMax > xmax:
                    xmax = glyph.xMax
                if ymin is None or glyph.yMin < ymin:
                    ymin = glyph.yMin
                if ymax is None or glyph.yMax > ymax:
                    ymax = glyph.yMax

    if 'head' in font:
        head = font['head']
        if xmin is None and hasattr(head, 'xMin'):
            xmin = head.xMin
        if xmax is None and hasattr(head, 'xMax'):
            xmax = head.xMax
        if ymin is None and hasattr(head, 'yMin'):
            ymin = head.yMin
        if ymax is None and hasattr(head, 'yMax'):
            ymax = head.yMax

    return xmin, ymin, xmax, ymax


def fix_vertical_metrics(input_path, output_path, flavor=None):
    """
    Fix vertical metrics per spec:
    - fsSelection: 8th bit (character) = 1
    - sTypoAscender and ascent = average(ascent, sTypoAscender) rounded to integer
    - sTypoDescender and descent = average(descent, sTypoDescender) rounded to integer
    - FontBBox (head) = (xMin, yMin, xMax, yMax) from glyph bounds
    """
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")

    font = TTFont(input_path)
    hhea = font['hhea']
    if 'OS/2' not in font:
        raise ValueError("Font does not contain OS/2 table")
    os2 = font['OS/2']

    # 1) fsSelection: eighth bit = 1 (bit 7, 0-based; 8th bit from right)
    os2.fsSelection |= (1 << 7)

    # 2) sTypoAscender and ascent = average of current ascent + sTypoAscender, rounded
    new_ascent = round((hhea.ascent + os2.sTypoAscender) / 2)
    hhea.ascent = new_ascent
    os2.sTypoAscender = new_ascent

    # 3) sTypoDescender and descent = average of current descent + sTypoDescender, rounded
    new_descent = round((hhea.descent + os2.sTypoDescender) / 2)
    hhea.descent = new_descent
    os2.sTypoDescender = new_descent

    # 4) FontBBox (head table) = xMin, yMin, xMax, yMax from glyph bounds
    xmin, ymin, xmax, ymax = get_font_bbox(font)
    if 'head' in font and all(v is not None for v in (xmin, ymin, xmax, ymax)):
        head = font['head']
        head.xMin = xmin
        head.yMin = ymin
        head.xMax = xmax
        head.yMax = ymax

    font.flavor = flavor if flavor else None
    font.save(output_path)
    print(f"✓ Fixed vertical metrics: {input_path} → {output_path}")
    print(f"  - ascent/sTypoAscender: {new_ascent} (avg rounded)")
    print(f"  - descent/sTypoDescender: {new_descent} (avg rounded)")
    print(f"  - FontBBox (head): xMin={xmin}, yMin={ymin}, xMax={xmax}, yMax={ymax}")
    print(f"  - fsSelection 8th bit set: {bool(os2.fsSelection & (1 << 7))}")


def main():
    parser = argparse.ArgumentParser(
        description='Fix vertical metrics in font files',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s input.ttf output.ttf
  %(prog)s input.ttf output.woff --flavor woff
  %(prog)s input.ttf output.woff2 --flavor woff2
        """
    )
    parser.add_argument('input', help='Input font file path')
    parser.add_argument('output', help='Output font file path')
    parser.add_argument('--flavor', choices=['woff', 'woff2'], 
                       help='Output format (woff or woff2). Default: same as input')
    
    args = parser.parse_args()
    
    try:
        fix_vertical_metrics(args.input, args.output, args.flavor)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
