'use client';

import { useState, useCallback } from 'react';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<'ttf' | 'woff' | 'woff2'>('ttf');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const fileName = droppedFile.name.toLowerCase();
      const validExtensions = ['.ttf', '.otf', '.woff', '.woff2'];
      const isValid = validExtensions.some(ext => fileName.endsWith(ext));
      
      if (isValid) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError('Please upload a valid font file (.ttf, .otf, .woff, or .woff2)');
      }
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  }, []);

  const handleProcess = useCallback(async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('format', format);

      // Try Python API first (for Vercel), fallback to Node.js API (for local dev)
      let apiEndpoint = '/api/fix-font';
      
      // In production/Vercel, use the Python serverless function
      // In local dev, the Node.js route will handle it
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process font');
      }

      // Get the filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = file.name.replace(/\.[^/.]+$/, '') + `-fixed.${format}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || 'Failed to process font file');
    } finally {
      setIsProcessing(false);
    }
  }, [file, format]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Vertical Metrics Fixer
          </h1>
          <p className="text-gray-600 mb-8">
            Fix inconsistent vertical metrics in your font files. Based on{' '}
            <a 
              href="https://www.maxkohler.com/posts/2022-02-19-fixing-vertical-metrics/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Max Kohler&apos;s guide
            </a>
            .
          </p>

          {/* Drag and Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-xl p-12 text-center transition-colors
              ${isDragging 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
              }
              ${file ? 'bg-green-50 border-green-400' : ''}
            `}
          >
            {file ? (
              <div className="space-y-4">
                <div className="text-green-600">
                  <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-lg font-semibold">{file.name}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <button
                  onClick={() => setFile(null)}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Remove file
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <div>
                  <p className="text-lg font-semibold text-gray-700">
                    Drag and drop your font file here
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    or click to browse
                  </p>
                </div>
                <input
                  type="file"
                  accept=".ttf,.otf,.woff,.woff2"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-input"
                />
                <label
                  htmlFor="file-input"
                  className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors"
                >
                  Select Font File
                </label>
              </div>
            )}
          </div>

          {/* Format Selection */}
          {file && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Output Format
              </label>
              <div className="flex gap-4">
                {(['ttf', 'woff', 'woff2'] as const).map((fmt) => (
                  <label key={fmt} className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="format"
                      value={fmt}
                      checked={format === fmt}
                      onChange={(e) => setFormat(e.target.value as typeof format)}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700 uppercase">
                      {fmt}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Process Button */}
          {file && (
            <button
              onClick={handleProcess}
              disabled={isProcessing}
              className={`
                mt-6 w-full py-4 px-6 rounded-lg font-semibold text-white transition-colors
                ${isProcessing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
                }
              `}
            >
              {isProcessing ? 'Processing...' : 'Fix Vertical Metrics'}
            </button>
          )}

          {/* Info Section */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              What this tool does:
            </h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">✓</span>
                Sets <code className="bg-gray-100 px-1 rounded">USE_TYPO_METRICS</code> flag
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">✓</span>
                Syncs OS/2 typo metrics with hhea metrics
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">✓</span>
                Sets OS/2 win metrics to match actual glyph bounds
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">✓</span>
                Ensures consistent rendering across platforms
              </li>
            </ul>
          </div>

          {/* CLI Usage */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Command Line Usage:
            </h2>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
              <div className="mb-2">
                <span className="text-gray-500"># Install dependencies</span>
              </div>
              <div className="mb-4">
                <span className="text-green-400">pip install -r requirements.txt</span>
              </div>
              <div className="mb-2">
                <span className="text-gray-500"># Fix font (outputs TTF)</span>
              </div>
              <div className="mb-4">
                <span className="text-green-400">python3 fix_vertical_metrics.py input.ttf output.ttf</span>
              </div>
              <div className="mb-2">
                <span className="text-gray-500"># Output as WOFF</span>
              </div>
              <div className="mb-4">
                <span className="text-green-400">python3 fix_vertical_metrics.py input.ttf output.woff --flavor woff</span>
              </div>
              <div className="mb-2">
                <span className="text-gray-500"># Output as WOFF2</span>
              </div>
              <div>
                <span className="text-green-400">python3 fix_vertical_metrics.py input.ttf output.woff2 --flavor woff2</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
