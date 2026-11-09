export class StorageError extends Error {
  constructor(
    message: string,
    readonly code: 'ENOENT' | 'EINVAL' = 'ENOENT',
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

/** 'a\\b//c/./d.txt' -> 'a/b/c/d.txt'. Rejects '..' and null bytes so nothing can escape the disk root. */
export function normalizePath(input: string): string {
  if (typeof input !== 'string' || input.includes('\0')) throw new StorageError('Invalid storage path.', 'EINVAL');

  const parts = input.replace(/\\/g, '/').split('/').filter((part) => part !== '' && part !== '.');
  if (parts.includes('..')) throw new StorageError(`Path "${input}" is outside the disk.`, 'EINVAL');
  return parts.join('/');
}

export function toBuffer(contents: string | Uint8Array): Buffer {
  return typeof contents === 'string' ? Buffer.from(contents, 'utf8') : Buffer.from(contents);
}

export async function collect(stream: AsyncIterable<unknown>): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : Buffer.from(chunk as Uint8Array));
  }
  return Buffer.concat(chunks);
}

const MIME: Record<string, string> = {
  txt: 'text/plain', html: 'text/html', htm: 'text/html', css: 'text/css', js: 'text/javascript', mjs: 'text/javascript',
  json: 'application/json', xml: 'application/xml', csv: 'text/csv', md: 'text/markdown', pdf: 'application/pdf',
  zip: 'application/zip', gz: 'application/gzip', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', ico: 'image/x-icon', avif: 'image/avif',
  mp3: 'audio/mpeg', wav: 'audio/wav', mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export function mimeFor(path: string): string {
  const extension = path.split('.').pop()?.toLowerCase() ?? '';
  return path.includes('.') ? (MIME[extension] ?? 'application/octet-stream') : 'application/octet-stream';
}

/** Content-Disposition with an ASCII fallback and the real UTF-8 name. */
export function contentDisposition(name: string, type: 'inline' | 'attachment'): string {
  const fallback = name.replace(/[^\x20-\x7e]|["\\%;]/g, '_');
  const encoded = encodeURIComponent(name).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${type}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
