import type { Request } from 'express';

/** Origen público (protocolo + host) para armar URLs absolutas de medios subidos. */
export function publicBaseUrlFromRequest(req: Request): string {
  const xfHost = req.get('x-forwarded-host');
  const xfProto = req.get('x-forwarded-proto');
  if (xfHost) {
    const host = xfHost.split(',')[0].trim();
    const proto = (xfProto?.split(',')[0].trim() || 'https').toLowerCase();
    const safeProto = proto === 'http' || proto === 'https' ? proto : 'https';
    return `${safeProto}://${host}`;
  }
  const host = req.get('host') || 'localhost:3000';
  const proto = (req as Request & { protocol?: string }).protocol || 'http';
  return `${proto}://${host}`;
}
