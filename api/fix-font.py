"""
Vercel Python serverless function: POST /api/fix-font

multipart/form-data fields:
  file     the font (.ttf, .otf, .woff, .woff2)
  align    "cap" (default) or "x"
  formats  comma-separated output formats, e.g. "woff2,otf"

Responds with the JSON produced by fix_vertical_metrics.process().
Local development uses app/api/fix-font/route.ts, which calls the same module.
"""

import json
import os
import sys
from email.parser import BytesParser
from email.policy import default as default_policy
from http.server import BaseHTTPRequestHandler

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from fix_vertical_metrics import parse_formats, process  # noqa: E402

MAX_BYTES = 4 * 1024 * 1024


def parse_form(content_type: str, body: bytes) -> dict:
    """Parse multipart/form-data with the stdlib MIME parser (binary-safe)."""
    message = BytesParser(policy=default_policy).parsebytes(
        b"Content-Type: " + content_type.encode() + b"\r\n\r\n" + body
    )
    fields = {}
    for part in message.iter_parts():
        name = part.get_param("name", header="content-disposition")
        if name:
            fields[name] = {"filename": part.get_filename(), "content": part.get_payload(decode=True) or b""}
    return fields


class handler(BaseHTTPRequestHandler):
    def _send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            content_type = self.headers.get("Content-Type", "")
            if "multipart/form-data" not in content_type:
                return self._send_json(400, {"error": "Content-Type must be multipart/form-data"})
            if length == 0 or length > MAX_BYTES:
                return self._send_json(413 if length else 400, {"error": "Font must be between 1 byte and 4 MB"})

            fields = parse_form(content_type, self.rfile.read(length))
            file_field = fields.get("file")
            if not file_field or not file_field["content"]:
                return self._send_json(400, {"error": "No file provided"})

            def text(name: str, fallback: str) -> str:
                field = fields.get(name)
                return field["content"].decode("utf-8", "ignore").strip() if field else fallback

            align = text("align", "cap")
            result = process(
                file_field["content"],
                file_field["filename"] or "font.ttf",
                align if align in ("cap", "x") else "cap",
                parse_formats(text("formats", "woff2")),
            )
            self._send_json(200, result)
        except Exception as exc:
            print(f"fix-font error: {exc}", file=sys.stderr)
            self._send_json(422, {"error": f"Could not read this font: {exc}"})
