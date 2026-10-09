import { AlignTarget, FixResult, OutputFormat } from './font-types';

export const ACCEPTED_EXTENSIONS = ['.ttf', '.otf', '.woff', '.woff2'];
export const MAX_FILE_BYTES = 4 * 1024 * 1024;

export function isFontFile(file: File) {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

/** Upload one font. XHR (not fetch) so upload progress can be reported. */
export function requestFix(
  file: File,
  options: { align: AlignTarget; formats: OutputFormat[] },
  onUploadProgress: (fraction: number) => void,
): Promise<FixResult> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);
    form.append('align', options.align);
    form.append('formats', options.formats.join(','));

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/fix-font');
    xhr.responseType = 'json';
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onUploadProgress(Math.min(event.loaded / event.total, 0.99));
    };
    xhr.upload.onload = () => onUploadProgress(1);
    xhr.onload = () => {
      const body = xhr.response as (FixResult & { error?: string }) | null;
      if (xhr.status >= 200 && xhr.status < 300 && body && !body.error) resolve(body);
      else reject(new Error(body?.error ?? `Server responded ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('Network error. Check your connection and try again.'));
    xhr.send(form);
  });
}

export function base64ToBytes(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
