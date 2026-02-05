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


def get_font_ymax_ymin(font):
    """
    Get the largest yMax and lowest yMin in the font.
    Uses glyph bounds; falls back to head table (head.yMax / head.yMin) then hhea.
    """
    ymax = None
    ymin = None

    # From glyph outlines (glyf table)
    if 'glyf' in font:
        for glyph_name in font.getGlyphSet().keys():
            glyph = font['glyf'][glyph_name]
            if glyph and hasattr(glyph, 'yMax') and hasattr(glyph, 'yMin'):
                if ymax is None or glyph.yMax > ymax:
                    ymax = glyph.yMax
                if ymin is None or glyph.yMin < ymin:
                    ymin = glyph.yMin

    # Fallback: head table (normally defines font bbox)
    if 'head' in font:
        head = font['head']
        if ymax is None and hasattr(head, 'yMax'):
            ymax = head.yMax
        if ymin is None and hasattr(head, 'yMin'):
            ymin = head.yMin

    # Fallback: hhea
    if ymax is None or ymin is None:
        hhea = font['hhea']
        if ymax is None:
            ymax = hhea.ascent
        if ymin is None:
            ymin = hhea.descent

    return ymax, ymin


def fix_vertical_metrics(input_path, output_path, flavor=None):
    """
    Fix vertical metrics per spec:
    - fsSelection 8th bit = 1
    - sTypoAscender and hhea ascent = highest yMax in the font
    - sTypoDescender and hhea descent = lowest yMin in the font
    - sTypoLineGap = hhea lineGap
    - usWinAscent / winAscent = highest yMax
    - usWinDescent / winDescent = lowest yMin * -1 (positive)
    """
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")

    font = TTFont(input_path)
    hhea = font['hhea']
    if 'OS/2' not in font:
        raise ValueError("Font does not contain OS/2 table")
    os2 = font['OS/2']

    # 1) Largest yMax and lowest yMin in the font
    ymax, ymin = get_font_ymax_ymin(font)

    # 2) hhea: ascent = highest yMax, descent = lowest yMin (sTypoAscender/sTypoDescender will match)
    hhea.ascent = ymax   # sTypoAscender and ascent must equal highest yMax
    hhea.descent = ymin  # ymin is typically negative
    # hhea.lineGap unchanged unless we want to force 0

    # 3) fsSelection: eighth bit = 1 (counting from left, MSB=1st; 8th bit = bit index 8)
    os2.fsSelection |= (1 << 8)

    # 4) OS/2 typo = hhea (sTypoAscender = ascent = highest yMax; sTypoDescender = descent = lowest yMin)
    os2.sTypoAscender = hhea.ascent   # same as ascent = highest yMax
    os2.sTypoDescender = hhea.descent
    os2.sTypoLineGap = hhea.lineGap

    # 5) usWinAscent / winAscent = largest yMax
    os2.usWinAscent = ymax
    if hasattr(os2, 'winAscent'):
        os2.winAscent = ymax

    # 6) usWinDescent / winDescent = lowest yMin * -1 (positive)
    us_win_descent = (-ymin) if ymin < 0 else ymin
    os2.usWinDescent = us_win_descent
    if hasattr(os2, 'winDescent'):
        os2.winDescent = us_win_descent

    font.flavor = flavor if flavor else None
    font.save(output_path)
    print(f"✓ Fixed vertical metrics: {input_path} → {output_path}")
    print(f"  - hhea ascent: {hhea.ascent}, descent: {hhea.descent}, lineGap: {hhea.lineGap}")
    print(f"  - OS/2 typo: ascent={os2.sTypoAscender}, descent={os2.sTypoDescender}, lineGap={os2.sTypoLineGap}")
    print(f"  - OS/2 win: ascent={os2.usWinAscent}, descent={os2.usWinDescent}")
    print(f"  - Font bounds: ymax={ymax}, ymin={ymin}")
    print(f"  - fsSelection 8th bit set: {bool(os2.fsSelection & (1 << 8))}")


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
