import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { buildBookingConfirmedEmail, type BookingConfirmedEmailModel } from './booking-confirmed-email';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('mail.smtp.host')?.trim() ?? '';
    if (!host) {
      this.logger.warn('SMTP_HOST no definido: no se enviarán correos (solo modo desarrollo con log).');
      return;
    }
    this.transporter = nodemailer.createTransport({
      host,
      port: this.config.get<number>('mail.smtp.port') ?? 587,
      secure: this.config.get<boolean>('mail.smtp.secure') === true,
      auth: {
        user: this.config.get<string>('mail.smtp.user') ?? '',
        pass: this.config.get<string>('mail.smtp.pass') ?? '',
      },
    });
  }

  isConfigured(): boolean {
    return this.transporter !== null;
  }

  async sendBookingOtp(to: string, code: string, businessName: string): Promise<void> {
    const from = this.config.get<string>('mail.from') ?? 'noreply@localhost';
    const subject = `Código de verificación — ${businessName}`;
    const text = `Tu código para confirmar la reserva en ${businessName} es: ${code}\n\nCaduca en unos minutos. Si no pediste este código, ignorá este mensaje.`;

    if (!this.transporter) {
      const nodeEnv = this.config.get<string>('NODE_ENV') ?? process.env.NODE_ENV ?? 'development';
      if (nodeEnv !== 'production') {
        this.logger.warn(`[DEV] OTP reserva pública para ${to}: ${code} (SMTP no configurado)`);
        return;
      }
      throw new ServiceUnavailableException(
        'El envío de correo no está configurado en el servidor. Contactá al comercio.',
      );
    }

    await this.transporter.sendMail({
      from,
      to,
      subject,
      text,
    });
  }

  /** Correo HTML al cliente tras confirmar reserva pública (no lanza si no hay SMTP en prod). */
  async sendBookingConfirmed(model: BookingConfirmedEmailModel): Promise<void> {
    const { subject, html, text } = buildBookingConfirmedEmail(model);
    const from = this.config.get<string>('mail.from') ?? 'noreply@localhost';

    if (!this.transporter) {
      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn(`[DEV] Confirmación de turno (sin SMTP) → ${model.to}\n${text}`);
        return;
      }
      this.logger.warn('SMTP no configurado: no se envió el correo de confirmación de turno.');
      return;
    }

    await this.transporter.sendMail({
      from,
      to: model.to,
      subject,
      text,
      html,
    });
  }
}
