"""
Vercel Python serverless function for fixing font vertical metrics.
Vercel automatically detects .py files in the /api directory and uses Python runtime.
"""

import json
import os
import sys
import tempfile
from http.server import BaseHTTPRequestHandler
from fontTools.ttLib import TTFont

# Import the fix function - try multiple paths for Vercel compatibility
def _import_fix_function():
    """Import fix_vertical_metrics function with fallback paths."""
    # Try importing from project root (for Vercel)
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if project_root not in sys.path:
        sys.path.insert(0, project_root)
    
    # Also try current directory
    current_dir = os.path.dirname(os.path.abspath(__file__))
    if current_dir not in sys.path:
        sys.path.insert(0, current_dir)
    
    try:
        from fix_vertical_metrics import fix_vertical_metrics
        return fix_vertical_metrics
    except ImportError:
        # If import fails, define the function inline as fallback
        # This ensures the function works even if the module can't be imported
        def get_font_ymax_ymin(font):
            ymax = None
            ymin = None
            if 'glyf' in font:
                for glyph_name in font.getGlyphSet().keys():
                    glyph = font['glyf'][glyph_name]
                    if glyph and hasattr(glyph, 'yMax') and hasattr(glyph, 'yMin'):
                        if ymax is None or glyph.yMax > ymax:
                            ymax = glyph.yMax
                        if ymin is None or glyph.yMin < ymin:
                            ymin = glyph.yMin
            if 'head' in font:
                head = font['head']
                if ymax is None and hasattr(head, 'yMax'):
                    ymax = head.yMax
                if ymin is None and hasattr(head, 'yMin'):
                    ymin = head.yMin
            if ymax is None or ymin is None:
                hhea = font['hhea']
                if ymax is None:
                    ymax = hhea.ascent
                if ymin is None:
                    ymin = hhea.descent
            return ymax, ymin

        def fix_vertical_metrics(input_path, output_path, flavor=None):
            if not os.path.exists(input_path):
                raise FileNotFoundError(f"Input file not found: {input_path}")
            font = TTFont(input_path)
            hhea = font['hhea']
            if 'OS/2' not in font:
                raise ValueError("Font does not contain OS/2 table")
            os2 = font['OS/2']
            ymax, ymin = get_font_ymax_ymin(font)
            hhea.ascent = ymax
            hhea.descent = ymin
            os2.fsSelection |= (1 << 7)
            os2.sTypoAscender = hhea.ascent
            os2.sTypoDescender = hhea.descent
            os2.sTypoLineGap = hhea.lineGap
            os2.usWinAscent = ymax
            if hasattr(os2, 'winAscent'):
                os2.winAscent = ymax
            us_win_descent = (-ymin) if ymin < 0 else ymin
            os2.usWinDescent = us_win_descent
            if hasattr(os2, 'winDescent'):
                os2.winDescent = us_win_descent
            font.flavor = flavor if flavor else None
            font.save(output_path)

        return fix_vertical_metrics

# Import the fix function
fix_vertical_metrics = _import_fix_function()


def parse_multipart(body, boundary):
    """Parse multipart/form-data body."""
    parts = {}
    boundary_bytes = boundary.encode() if isinstance(boundary, str) else boundary
    
    # Split by boundary
    sections = body.split(boundary_bytes)
    
    for section in sections:
        section = section.strip()
        if not section or section == b'--':
            continue
        
        # Split headers and content
        if b'\r\n\r\n' not in section:
            continue
            
        headers_raw, content = section.split(b'\r\n\r\n', 1)
        headers_raw = headers_raw.decode('utf-8', errors='ignore')
        content = content.rstrip(b'\r\n--')
        
        # Parse headers
        headers = {}
        for line in headers_raw.split('\r\n'):
            if ':' in line:
                key, value = line.split(':', 1)
                headers[key.strip().lower()] = value.strip()
        
        # Extract field name and filename
        content_disposition = headers.get('content-disposition', '')
        field_name = None
        filename = None
        
        if 'name=' in content_disposition:
            for part in content_disposition.split(';'):
                part = part.strip()
                if part.startswith('name='):
                    field_name = part.split('=', 1)[1].strip('"\'')
                elif part.startswith('filename='):
                    filename = part.split('=', 1)[1].strip('"\'')
        
        if field_name:
            parts[field_name] = {
                'content': content,
                'filename': filename,
                'headers': headers
            }
    
    return parts


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS preflight requests."""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        """Handle POST requests to fix font files."""
        try:
            # Get content length
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self.send_error(400, 'No content')
                return
            
            # Read request body
            body = self.rfile.read(content_length)
            
            # Parse Content-Type to get boundary
            content_type = self.headers.get('Content-Type', '')
            if 'multipart/form-data' not in content_type:
                self.send_error(400, 'Content-Type must be multipart/form-data')
                return
            
            # Extract boundary
            boundary = None
            for part in content_type.split(';'):
                part = part.strip()
                if part.startswith('boundary='):
                    boundary = '--' + part.split('=', 1)[1].strip('"\'')
                    break
            
            if not boundary:
                self.send_error(400, 'No boundary found')
                return
            
            # Parse multipart data
            parts = parse_multipart(body, boundary)
            
            # Get file and format
            file_part = parts.get('file')
            format_part = parts.get('format', {})
            
            if not file_part or not file_part.get('content'):
                self.send_error(400, 'No file provided')
                return
            
            file_data = file_part['content']
            file_name = file_part.get('filename', 'font.ttf')
            output_format = format_part.get('content', b'ttf').decode('utf-8', errors='ignore').strip() or 'ttf'
            
            if output_format not in ['ttf', 'woff', 'woff2']:
                output_format = 'ttf'
            
            # Create temporary directory
            with tempfile.TemporaryDirectory() as temp_dir:
                # Save input file
                input_path = os.path.join(temp_dir, file_name)
                with open(input_path, 'wb') as f:
                    f.write(file_data)
                
                # Determine output path
                base_name = os.path.splitext(file_name)[0]
                if output_format == 'woff':
                    output_path = os.path.join(temp_dir, f'{base_name}-fixed.woff')
                    flavor = 'woff'
                elif output_format == 'woff2':
                    output_path = os.path.join(temp_dir, f'{base_name}-fixed.woff2')
                    flavor = 'woff2'
                else:
                    output_path = os.path.join(temp_dir, f'{base_name}-fixed.ttf')
                    flavor = None
                
                # Process the font
                fix_vertical_metrics(input_path, output_path, flavor)
                
                # Read the output file
                with open(output_path, 'rb') as f:
                    output_data = f.read()
                
                # Determine content type
                content_type_map = {
                    'ttf': 'font/ttf',
                    'woff': 'font/woff',
                    'woff2': 'font/woff2'
                }
                response_content_type = content_type_map.get(output_format, 'application/octet-stream')
                
                # Send response
                self.send_response(200)
                self.send_header('Content-Type', response_content_type)
                self.send_header('Content-Disposition', f'attachment; filename="{base_name}-fixed.{output_format}"')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(output_data)
                
        except Exception as e:
            import traceback
            error_msg = str(e)
            traceback_str = traceback.format_exc()
            print(f"Error in fix-font API: {error_msg}", file=sys.stderr)
            print(traceback_str, file=sys.stderr)
            
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            error_response = json.dumps({
                'error': error_msg
            }).encode()
            self.wfile.write(error_response)
