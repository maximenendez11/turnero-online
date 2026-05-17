/** Datos para el correo de confirmación de reserva (valores ya saneados donde aplica). */
export type BookingConfirmedEmailModel = {
  to: string;
  businessName: string;
  businessAddress: string;
  customerName: string;
  serviceName: string;
  durationMin: number;
  /** Precio legible (ej. ARS) o «A consultar». */
  priceLine: string;
  whenLine: string;
  timezoneLabel: string;
  bookingCode: string;
  manageUrl: string;
  /** Color de marca del negocio (#RRGGBB). Si falta, se usa el acento por defecto. */
  brandPrimaryHex?: string | null;
};

const DEFAULT_BRAND = '#4f46e5';
const PAGE_BG = '#f3f4f6';
const CARD_BG = '#ffffff';
const TEXT = '#111827';
const TEXT_MUTED = '#6b7280';
const BORDER = '#e5e7eb';
const SURFACE = '#f9fafb';

export function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseHex6(value: string | null | undefined): { r: number; g: number; b: number } | null {
  const m = /^#([0-9a-fA-F]{6})$/.exec((value ?? '').trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function relativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const lin = [rgb.r, rgb.g, rgb.b].map((c) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function mixHex(base: string, mixWith: string, ratio: number): string {
  const A = parseHex6(base);
  const B = parseHex6(mixWith);
  if (!A || !B) return base;
  const t = Math.min(1, Math.max(0, ratio));
  const r = Math.round(A.r * (1 - t) + B.r * t);
  const g = Math.round(A.g * (1 - t) + B.g * t);
  const b = Math.round(A.b * (1 - t) + B.b * t);
  const h = (n: number) => n.toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function resolveBrandColors(brandPrimaryHex?: string | null): {
  brand: string;
  onBrand: string;
  brandSoft: string;
} {
  const brand = parseHex6(brandPrimaryHex) ? brandPrimaryHex!.trim().toLowerCase() : DEFAULT_BRAND;
  const rgb = parseHex6(brand)!;
  const onBrand = relativeLuminance(rgb) > 0.55 ? TEXT : '#ffffff';
  const brandSoft = mixHex(brand, '#ffffff', 0.88);
  return { brand, onBrand, brandSoft };
}

/**
 * HTML responsive-friendly (tabla + estilos inline) para clientes de correo.
 * Siempre en modo claro: evita inversiones automáticas en clientes móviles.
 */
export function buildBookingConfirmedEmail(m: BookingConfirmedEmailModel): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Turno confirmado · ${m.businessName}`;
  const e = escapeHtml;
  const { brand, onBrand, brandSoft } = resolveBrandColors(m.brandPrimaryHex);
  const preheader = `Tu turno en ${m.businessName} · código ${m.bookingCode}`;

  const text = [
    `Hola ${m.customerName},`,
    ``,
    `Tu turno en ${m.businessName} quedó confirmado.`,
    ``,
    `Código: ${m.bookingCode}`,
    `Servicio: ${m.serviceName} (${m.durationMin} min)`,
    `Precio: ${m.priceLine}`,
    `Fecha y hora: ${m.whenLine} (${m.timezoneLabel})`,
    `Dirección: ${m.businessAddress}`,
    ``,
    `Ver o gestionar tu turno: ${m.manageUrl}`,
    ``,
    `Si no solicitaste esta reserva, ignorá este mensaje.`,
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light" />
  <title>${e(subject)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    :root { color-scheme: light only; supported-color-schemes: light; }
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    @media (prefers-color-scheme: dark) {
      .email-body, .email-outer { background-color: ${PAGE_BG} !important; }
      .email-card { background-color: ${CARD_BG} !important; }
    }
  </style>
</head>
<body class="email-body" style="margin:0;padding:0;width:100%!important;background-color:${PAGE_BG};color:${TEXT};font-family:Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none!important;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${e(preheader)}</div>
  <table role="presentation" class="email-outer" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${PAGE_BG}" style="background-color:${PAGE_BG};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" class="email-card" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${CARD_BG}" style="max-width:600px;background-color:${CARD_BG};border:1px solid ${BORDER};border-radius:12px;overflow:hidden;">
          <tr>
            <td bgcolor="${brand}" style="padding:0;background-color:${brand};">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding:28px 28px 24px;">
                    <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${onBrand};opacity:0.9;font-weight:600;font-family:Helvetica,Arial,sans-serif;">Reserva confirmada</p>
                    <h1 style="margin:0;font-size:24px;line-height:1.3;font-weight:700;color:${onBrand};font-family:Helvetica,Arial,sans-serif;">${e(m.businessName)}</h1>
                    <p style="margin:10px 0 0;font-size:14px;line-height:1.5;color:${onBrand};opacity:0.92;font-family:Helvetica,Arial,sans-serif;">${e(m.businessAddress)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td bgcolor="${CARD_BG}" style="padding:28px 28px 8px;background-color:${CARD_BG};">
              <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:${TEXT};font-family:Helvetica,Arial,sans-serif;">Hola <strong>${e(
                m.customerName,
              )}</strong>, tu turno ya está agendado. Guardá estos datos:</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${brandSoft}" style="background-color:${brandSoft};border-radius:10px;border:1px solid ${BORDER};">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:${TEXT_MUTED};font-weight:600;font-family:Helvetica,Arial,sans-serif;">Código de reserva</p>
                    <p style="margin:0;font-size:22px;font-weight:700;letter-spacing:0.05em;color:${brand};font-family:Menlo,Consolas,Monaco,monospace;">${e(
                      m.bookingCode,
                    )}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td bgcolor="${CARD_BG}" style="padding:8px 28px 24px;background-color:${CARD_BG};">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:separate;border-spacing:0 10px;">
                <tr>
                  <td bgcolor="${SURFACE}" style="padding:16px 18px;background-color:${SURFACE};border-radius:10px;border:1px solid ${BORDER};">
                    <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:${TEXT_MUTED};font-weight:600;font-family:Helvetica,Arial,sans-serif;">Servicio</p>
                    <p style="margin:0;font-size:16px;font-weight:600;color:${TEXT};font-family:Helvetica,Arial,sans-serif;">${e(m.serviceName)}</p>
                    <p style="margin:6px 0 0;font-size:14px;color:${TEXT_MUTED};font-family:Helvetica,Arial,sans-serif;">${m.durationMin} min · ${e(m.priceLine)}</p>
                  </td>
                </tr>
                <tr>
                  <td bgcolor="${SURFACE}" style="padding:16px 18px;background-color:${SURFACE};border-radius:10px;border:1px solid ${BORDER};">
                    <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:${TEXT_MUTED};font-weight:600;font-family:Helvetica,Arial,sans-serif;">Fecha y hora</p>
                    <p style="margin:0;font-size:16px;font-weight:600;color:${TEXT};font-family:Helvetica,Arial,sans-serif;">${e(m.whenLine)}</p>
                    <p style="margin:6px 0 0;font-size:13px;color:${TEXT_MUTED};font-family:Helvetica,Arial,sans-serif;">${e(m.timezoneLabel)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td bgcolor="${CARD_BG}" align="center" style="padding:0 28px 32px;background-color:${CARD_BG};">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                <tr>
                  <td align="center" bgcolor="${brand}" style="border-radius:8px;background-color:${brand};">
                    <a href="${e(m.manageUrl)}" target="_blank" style="display:inline-block;padding:14px 32px;border-radius:8px;background-color:${brand};color:${onBrand};text-decoration:none;font-weight:700;font-size:16px;font-family:Helvetica,Arial,sans-serif;mso-padding-alt:0;">Ver mi turno</a>
                  </td>
                </tr>
              </table>
              <p style="margin:18px 0 0;font-size:13px;line-height:1.55;color:${TEXT_MUTED};max-width:440px;font-family:Helvetica,Arial,sans-serif;">Si el botón no funciona, copiá y pegá este enlace en el navegador:<br /><a href="${e(
                m.manageUrl,
              )}" style="color:${brand};word-break:break-all;text-decoration:underline;">${e(m.manageUrl)}</a></p>
            </td>
          </tr>
          <tr>
            <td bgcolor="${SURFACE}" style="padding:18px 24px;border-top:1px solid ${BORDER};background-color:${SURFACE};">
              <p style="margin:0;font-size:12px;line-height:1.55;color:${TEXT_MUTED};text-align:center;font-family:Helvetica,Arial,sans-serif;">Este mensaje se envió a ${e(
                m.to,
              )} porque confirmaste una reserva en ${e(m.businessName)}.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}
