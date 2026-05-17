/** Solo rutas internas relativas (evita open redirect). */
export function safeReturnUrl(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const path = raw.trim();
  if (!path.startsWith('/') || path.startsWith('//')) return null;
  return path;
}
