import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const outputFormat = formData.get('format') as string || 'ttf';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const validExtensions = ['.ttf', '.otf', '.woff', '.woff2'];
    const fileName = file.name.toLowerCase();
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
    
    if (!hasValidExtension) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a .ttf, .otf, .woff, or .woff2 file' },
        { status: 400 }
      );
    }

    // Create temporary directory
    const tempDir = join(tmpdir(), `font-fix-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });

    // Save uploaded file
    const inputPath = join(tempDir, file.name);
    const arrayBuffer = await file.arrayBuffer();
    await writeFile(inputPath, Buffer.from(arrayBuffer));

    // Determine output path and flavor
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    let outputPath: string;
    let flavor: string | null = null;

    if (outputFormat === 'woff') {
      outputPath = join(tempDir, `${baseName}-fixed.woff`);
      flavor = 'woff';
    } else if (outputFormat === 'woff2') {
      outputPath = join(tempDir, `${baseName}-fixed.woff2`);
      flavor = 'woff2';
    } else {
      outputPath = join(tempDir, `${baseName}-fixed.ttf`);
    }

    // Run Python script
    // In production, the script should be in the root directory
    const scriptPath = join(process.cwd(), 'fix_vertical_metrics.py');
    const flavorArg = flavor ? `--flavor ${flavor}` : '';
    
    // Check if virtual environment exists, use it if available
    const venvPath = process.platform === 'win32'
      ? join(process.cwd(), 'venv', 'Scripts', 'python.exe')
      : join(process.cwd(), 'venv', 'bin', 'python');
    const pythonCmd = existsSync(venvPath) 
      ? venvPath 
      : (process.platform === 'win32' ? 'python' : 'python3');
    
    const command = `${pythonCmd} "${scriptPath}" "${inputPath}" "${outputPath}" ${flavorArg}`.trim();

    try {
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr && !stderr.includes('✓')) {
        console.error('Python script stderr:', stderr);
      }
    } catch (error: any) {
      // Clean up temp files
      await unlink(inputPath).catch(() => {});
      await unlink(outputPath).catch(() => {});
      
      return NextResponse.json(
        { error: `Failed to process font: ${error.message}` },
        { status: 500 }
      );
    }

    // Read the output file
    const { readFile } = await import('fs/promises');
    const outputBuffer = await readFile(outputPath);

    // Clean up temp files
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});

    // Determine content type
    const contentType = 
      outputFormat === 'woff' ? 'font/woff' :
      outputFormat === 'woff2' ? 'font/woff2' :
      'font/ttf';

    // Return the file
    return new NextResponse(outputBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${baseName}-fixed.${outputFormat}"`,
      },
    });
  } catch (error: any) {
    console.error('Error processing font:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process font file' },
      { status: 500 }
    );
  }
}
