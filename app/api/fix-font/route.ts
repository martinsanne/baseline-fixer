import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { NextRequest, NextResponse } from 'next/server';

// Local development handler. On Vercel, api/fix-font.py serves the same path
// and contract; both delegate to fix_vertical_metrics.py.

export const runtime = 'nodejs';

const VALID_EXTENSIONS = ['.ttf', '.otf', '.woff', '.woff2'];
const MAX_BYTES = 4 * 1024 * 1024;

function pythonExecutable() {
  const venv =
    process.platform === 'win32'
      ? join(process.cwd(), 'venv', 'Scripts', 'python.exe')
      : join(process.cwd(), 'venv', 'bin', 'python');
  if (existsSync(venv)) return venv;
  return process.platform === 'win32' ? 'python' : 'python3';
}

function runPython(payload: object): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(pythonExecutable(), [join(process.cwd(), 'fix_vertical_metrics.py'), '--json-stdin']);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
    child.stdin.end(JSON.stringify(payload));
  });
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  if (!VALID_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))) {
    return NextResponse.json({ error: 'Upload a .ttf, .otf, .woff or .woff2 file' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Font must be 4 MB or smaller' }, { status: 413 });
  }

  const align = form.get('align') === 'x' ? 'x' : 'cap';
  const formats = String(form.get('formats') ?? 'woff2');
  const data = Buffer.from(await file.arrayBuffer()).toString('base64');

  try {
    const { code, stdout, stderr } = await runPython({ filename: file.name, data, align, formats });
    if (stderr) console.error('fix_vertical_metrics.py:', stderr);
    const result = JSON.parse(stdout || '{}');
    if (code !== 0 || result.error) {
      return NextResponse.json({ error: `Could not read this font: ${result.error ?? stderr}` }, { status: 422 });
    }
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Font processing failed: ${message}` }, { status: 500 });
  }
}
