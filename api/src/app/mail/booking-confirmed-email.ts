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
};

export function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * HTML responsive-friendly (tabla + estilos inline) para clientes de correo.
 */
export function buildBookingConfirmedEmail(m: BookingConfirmedEmailModel): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Turno confirmado · ${m.businessName}`;
  const e = escapeHtml;

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
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${e(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#0f1117;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f1117;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#161922;border-radius:20px;overflow:hidden;border:1px solid #252a3a;box-shadow:0 24px 48px rgba(0,0,0,0.45);">
          <tr>
            <td style="padding:0;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 42%,#a855f7 100%);">
              <div style="padding:28px 28px 22px;">
                <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.82);font-weight:600;">Reserva confirmada</p>
                <h1 style="margin:0;font-size:22px;line-height:1.25;font-weight:700;color:#ffffff;">${e(m.businessName)}</h1>
                <p style="margin:10px 0 0;font-size:14px;line-height:1.5;color:rgba(255,255,255,0.9);">${e(m.businessAddress)}</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 28px 8px;">
              <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#e4e7ef;">Hola <strong style="color:#f8fafc;">${e(
                m.customerName,
              )}</strong>, tu turno ya está agendado. Guardá estos datos:</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#1e2433;border-radius:14px;border:1px solid #2a3144;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 12px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#94a3b8;font-weight:600;">Código de reserva</p>
                    <p style="margin:0;font-size:20px;font-weight:800;letter-spacing:0.06em;color:#a5b4fc;font-family:ui-monospace,Menlo,Consolas,monospace;">${e(
                      m.bookingCode,
                    )}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 22px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0 10px;">
                <tr>
                  <td style="padding:14px 16px;background:#1a1f2e;border-radius:12px;border:1px solid #2a3144;">
                    <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Servicio</p>
                    <p style="margin:0;font-size:15px;font-weight:600;color:#f1f5f9;">${e(m.serviceName)}</p>
                    <p style="margin:6px 0 0;font-size:13px;color:#cbd5e1;">${m.durationMin} min · ${e(m.priceLine)}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;background:#1a1f2e;border-radius:12px;border:1px solid #2a3144;">
                    <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Fecha y hora</p>
                    <p style="margin:0;font-size:15px;font-weight:600;color:#f1f5f9;">${e(m.whenLine)}</p>
                    <p style="margin:6px 0 0;font-size:12px;color:#94a3b8;">${e(m.timezoneLabel)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;" align="center">
              <a href="${e(m.manageUrl)}" style="display:inline-block;padding:14px 28px;border-radius:999px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;box-shadow:0 10px 28px rgba(99,102,241,0.35);">Ver mi turno</a>
              <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#64748b;max-width:420px;">Si el botón no funciona, copiá y pegá este enlace en el navegador:<br /><span style="color:#94a3b8;word-break:break-all;">${e(
                m.manageUrl,
              )}</span></p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px 22px;border-top:1px solid #252a3a;background:#12151c;">
              <p style="margin:0;font-size:11px;line-height:1.55;color:#64748b;text-align:center;">Este mensaje se envió a ${e(
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
