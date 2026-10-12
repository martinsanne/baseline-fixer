import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Serves the git-ignored fonts in test-fonts/ to the renderer test page. They are read at
// request time rather than imported, so the production build doesn't depend on them.
const FONTS = new Set(['original.woff2', 'fixed.woff2']);

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { name: string } }) {
  if (!FONTS.has(params.name)) return new Response('Not found', { status: 404 });
  try {
    const data = await readFile(path.join(process.cwd(), 'test-fonts', params.name));
    return new Response(data, { headers: { 'Content-Type': 'font/woff2', 'Cache-Control': 'no-store' } });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
