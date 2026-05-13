export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '3d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  },
  /** URL pública del front (sin barra final), p. ej. enlaces en correos de reserva. */
  publicAppUrl: (() => {
    const explicit = process.env.PUBLIC_APP_URL?.trim();
    if (explicit) return explicit.replace(/\/+$/, '');
    const cors = process.env.CORS_ORIGIN?.trim();
    if (cors && cors !== '*') return cors.replace(/\/+$/, '');
    return 'http://localhost:4200';
  })(),
  weather: {
    apiKey: process.env.WEATHER_API_KEY,
  },
  googleMaps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  },
  recaptcha: {
    secretKey: process.env.RECAPTCHA_SECRET_KEY || '',
    siteKey: process.env.RECAPTCHA_SITE_KEY || '',
  },
  mail: {
    /** Si no hay SMTP configurado, los envíos se omiten (modo desarrollo). */
    smtp: {
      host: process.env.SMTP_HOST || '',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
    /** Remitente por defecto (ej. noreply@tudominio.com). */
    from: process.env.MAIL_FROM || 'noreply@cartelera.local',
    /** Casilla(s) donde reciben los mensajes del formulario de contacto. Varias separadas por coma. */
    contactInbox: process.env.MAIL_CONTACT_INBOX || '',
    /** Opcional: casilla(s) en copia (CC). Varias separadas por coma. */
    contactCc: process.env.MAIL_CONTACT_CC || '',
  },
  google: {
    /** Client ID de tipo «Aplicación web» para verificar `id_token` en reservas públicas. */
    oauthClientId: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
  },
  bookingContact: {
    /** Secreto para el JWT de contacto; por defecto el mismo que usuarios (claims distintos). */
    jwtSecret: process.env.BOOKING_CONTACT_JWT_SECRET || process.env.JWT_SECRET || '',
    jwtExpiresIn: process.env.BOOKING_CONTACT_JWT_EXPIRES_IN || '15m',
    otpExpiresMinutes: parseInt(process.env.BOOKING_CONTACT_OTP_EXPIRES_MINUTES || '15', 10) || 15,
    otpMaxAttempts: parseInt(process.env.BOOKING_CONTACT_OTP_MAX_ATTEMPTS || '5', 10) || 5,
  },
});
