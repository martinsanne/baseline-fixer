"""
Vercel Python serverless function for fixing font vertical metrics.
Vercel automatically detects .py files in the /api directory and uses Python runtime.
"""

import json
import os
import sys
import tempfile
from http.server import BaseHTTPRequestHandler

# Add project root to path to import our module
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

try:
    from fix_vertical_metrics import fix_vertical_metrics
except ImportError:
    # If import fails, try adding current directory
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from fix_vertical_metrics import fix_vertical_metrics


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
