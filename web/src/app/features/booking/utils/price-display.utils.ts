/**
 * Interpreta un precio almacenado como texto (API / Prisma Decimal en string).
 * Soporta decimales con punto o coma y miles con punto estilo es-AR cuando aplica.
 */
export function parsePriceToNumber(raw: string): number | null {
  const s = raw.trim();
  if (!s || !/\d/.test(s)) return null;

  const onlySep = s.replace(/[^\d.,\-]/g, '');
  if (!onlySep || !/\d/.test(onlySep)) return null;

  const lastComma = onlySep.lastIndexOf(',');
  const lastDot = onlySep.lastIndexOf('.');

  let normalized: string;
  if (lastComma >= 0 && lastDot >= 0) {
    normalized =
      lastComma > lastDot
        ? onlySep.replace(/\./g, '').replace(',', '.')
        : onlySep.replace(/,/g, '');
  } else if (lastComma >= 0) {
    const parts = onlySep.split(',');
    normalized =
      parts.length === 2 && parts[1].length <= 2
        ? parts[0].replace(/\./g, '') + '.' + parts[1]
        : onlySep.replace(/,/g, '');
  } else {
    const parts = onlySep.split('.');
    if (parts.length === 2) {
      if (parts[1].length <= 2) normalized = onlySep;
      else if (parts[1].length === 3) normalized = parts[0] + parts[1];
      else normalized = parts[0] + '.' + parts[1];
    } else if (parts.length > 2) {
      normalized = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
    } else {
      normalized = onlySep;
    }
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/** Precio para listados: pesos argentinos, miles con punto y símbolo $. Texto no numérico se devuelve tal cual. */
export function formatListPrice(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '—';
  const n = parsePriceToNumber(trimmed);
  if (n === null) return trimmed;
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Listado público: respeta «precio a definir». */
export function formatServiceListPrice(service: { price: string; priceOnRequest?: boolean | null }): string {
  if (service.priceOnRequest) return 'A definir';
  return formatListPrice(service.price);
}
