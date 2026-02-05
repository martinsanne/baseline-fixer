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


def find_ymax_ymin(font):
    """Find the largest ymax and lowest ymin values in the font."""
    ymax = None
    ymin = None
    
    for glyph_name in font.getGlyphSet().keys():
        glyph = font['glyf'][glyph_name] if 'glyf' in font else None
        if glyph and hasattr(glyph, 'yMax') and hasattr(glyph, 'yMin'):
            if ymax is None or glyph.yMax > ymax:
                ymax = glyph.yMax
            if ymin is None or glyph.yMin < ymin:
                ymin = glyph.yMin
    
    # Fallback to hhea values if no glyphs found
    if ymax is None:
        hhea = font['hhea']
        ymax = hhea.ascent
    if ymin is None:
        hhea = font['hhea']
        ymin = hhea.descent
    
    return ymax, ymin


def fix_vertical_metrics(input_path, output_path, flavor=None):
    """
    Fix vertical metrics in a font file.
    
    Args:
        input_path: Path to input font file
        output_path: Path to output font file
        flavor: Optional flavor ('woff' or 'woff2')
    """
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")
    
    # Load the font
    font = TTFont(input_path)
    
    # Get hhea table values
    hhea = font['hhea']
    hhea_ascent = hhea.ascent
    hhea_descent = hhea.descent
    hhea_linegap = hhea.lineGap
    
    # Get OS/2 table
    if 'OS/2' not in font:
        raise ValueError("Font does not contain OS/2 table")
    
    os2 = font['OS/2']
    
    # Set fsSelect bit 7 to 1 (USE_TYPO_METRICS)
    os2.fsSelection |= (1 << 7)  # Set bit 7
    
    # Sync OS/2 typo metrics with hhea metrics
    os2.sTypoAscender = hhea_ascent
    os2.sTypoDescender = hhea_descent
    os2.sTypoLineGap = hhea_linegap
    
    # Find ymax and ymin from glyphs
    ymax, ymin = find_ymax_ymin(font)
    
    # Set OS/2 win metrics to match actual glyph bounds
    os2.usWinAscent = ymax
    os2.usWinDescent = abs(ymin) if ymin < 0 else ymin
    
    # Save the font (set flavor on the font object; save() does not accept flavor=)
    font.flavor = flavor if flavor else None
    font.save(output_path)
    print(f"✓ Fixed vertical metrics: {input_path} → {output_path}")
    print(f"  - hhea ascent: {hhea_ascent}, descent: {hhea_descent}, lineGap: {hhea_linegap}")
    print(f"  - OS/2 typo: ascent={os2.sTypoAscender}, descent={os2.sTypoDescender}, lineGap={os2.sTypoLineGap}")
    print(f"  - OS/2 win: ascent={os2.usWinAscent}, descent={os2.usWinDescent}")
    print(f"  - Glyph bounds: ymax={ymax}, ymin={ymin}")
    print(f"  - USE_TYPO_METRICS bit set: {bool(os2.fsSelection & (1 << 7))}")


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
