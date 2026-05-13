/** Contacto tal como llega de la reserva (email o teléfono en un solo campo). */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export function isLikelyEmail(contact: string): boolean {
  const t = contact.trim();
  return t.length > 0 && EMAIL_RE.test(t);
}

export function mailtoHref(contact: string, customerName: string): string | null {
  if (!isLikelyEmail(contact)) return null;
  const email = contact.trim();
  const sub = customerName.trim() ? `Hola ${customerName.trim()}` : '';
  return sub ? `mailto:${email}?subject=${encodeURIComponent(sub)}` : `mailto:${email}`;
}

export function digitsOnly(contact: string): string {
  return contact.replace(/\D/g, '');
}

export function whatsappDigitsValid(contact: string): boolean {
  if (isLikelyEmail(contact)) return false;
  const d = digitsOnly(contact);
  return d.length >= 8 && d.length <= 15;
}

/**
 * Mensaje sugerido al reactivar clientes (se envía como `text` prefijado en wa.me).
 * `ultimaVisitaLabel`: fecha ya formateada para el humano (p. ej. en zona del negocio).
 */
export function buildWhatsappOutreachBody(
  nombre: string,
  ultimaVisitaLabel: string | null,
  servicio: string | null,
): string {
  const n = nombre.trim() || 'ahí';
  const v = ultimaVisitaLabel?.trim() || 'una visita anterior';
  const s = servicio?.trim() || 'nuestros servicios';
  return `Hola ${n}, ¿cómo estás? 👋
Notamos que tu última visita fue el ${v}. Ya pasó un tiempo desde entonces y queríamos avisarte que tenemos turnos disponibles para ${s}.

Si querés mantener tu rutina o asegurar tu lugar, podés reservar tu próximo turno en unos segundos. ¡Te esperamos!`;
}

/** `wa.me` sin +: solo dígitos E.164 sin el +. Opcional `text` prefijado. */
export function whatsappHref(contact: string, prefilledBody?: string): string | null {
  if (!whatsappDigitsValid(contact)) return null;
  const d = digitsOnly(contact);
  const base = `https://wa.me/${d}`;
  const t = prefilledBody?.trim();
  if (!t) return base;
  return `${base}?text=${encodeURIComponent(t)}`;
}
