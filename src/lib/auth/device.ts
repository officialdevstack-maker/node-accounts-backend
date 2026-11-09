export function describeDevice(userAgent?: string | null): string {
  if (!userAgent) return 'Unknown device';

  const os =
    /iPhone|iPad|iPod/i.test(userAgent) ? 'iOS'
    : /Android/i.test(userAgent) ? 'Android'
    : /Windows/i.test(userAgent) ? 'Windows'
    : /Mac OS X|Macintosh/i.test(userAgent) ? 'macOS'
    : /Linux/i.test(userAgent) ? 'Linux'
    : null;

  const client =
    /PostmanRuntime/i.test(userAgent) ? 'Postman'
    : /curl\//i.test(userAgent) ? 'curl'
    : /Edg\//.test(userAgent) ? 'Edge'
    : /OPR\/|Opera/.test(userAgent) ? 'Opera'
    : /Firefox\//.test(userAgent) ? 'Firefox'
    : /Chrome\//.test(userAgent) ? 'Chrome'
    : /Safari\//.test(userAgent) ? 'Safari'
    : null;

  if (client && os) return `${client} on ${os}`;
  return client ?? os ?? 'Unknown device';
}
