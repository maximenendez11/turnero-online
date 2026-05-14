import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type SiteverifyResponse = {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
};

@Injectable()
export class RecaptchaVerificationService {
  private readonly logger = new Logger(RecaptchaVerificationService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Si `RECAPTCHA_SECRET_KEY` está definido, exige token y valida con Google (v3).
   * Sin secreto (desarrollo), no hace nada.
   */
  async assertValid(token: string | undefined, expectedAction: 'login' | 'register'): Promise<void> {
    const secret = this.config.get<string>('recaptcha.secretKey')?.trim() ?? '';
    if (!secret) {
      return;
    }
    const trimmed = token?.trim();
    if (!trimmed) {
      throw new BadRequestException('Falta la verificación de seguridad (reCAPTCHA).');
    }

    const body = new URLSearchParams();
    body.set('secret', secret);
    body.set('response', trimmed);

    let res: Response;
    try {
      res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
    } catch (e) {
      this.logger.warn(`reCAPTCHA siteverify request failed: ${String(e)}`);
      throw new BadRequestException('No se pudo validar la verificación de seguridad.');
    }

    const data = (await res.json()) as SiteverifyResponse;
    if (!data.success) {
      this.logger.warn(`reCAPTCHA rejected: ${JSON.stringify(data['error-codes'] ?? [])}`);
      throw new BadRequestException('Verificación de seguridad no válida.');
    }

    if (typeof data.score === 'number' && data.score < 0.5) {
      this.logger.warn(`reCAPTCHA low score: ${data.score} action=${data.action}`);
      throw new BadRequestException('No se pudo confirmar el acceso. Intentá de nuevo en unos segundos.');
    }

    if (data.action && data.action !== expectedAction) {
      this.logger.warn(`reCAPTCHA action mismatch: ${data.action} vs ${expectedAction}`);
      throw new BadRequestException('Verificación de seguridad no válida.');
    }
  }
}
