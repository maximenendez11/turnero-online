import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  /** Configuración pública para el frontend (p. ej. API key de Google Maps, reCAPTCHA site key). */
  @Get('config')
  getPublicConfig() {
    const googleMapsApiKey = this.config.get<string>('googleMaps.apiKey');
    const recaptchaSiteKey = this.config.get<string>('recaptcha.siteKey');
    const googleOAuthClientId = this.config.get<string>('google.oauthClientId');
    return {
      googleMapsApiKey: googleMapsApiKey || null,
      recaptchaSiteKey: recaptchaSiteKey || null,
      googleOAuthClientId: googleOAuthClientId?.trim() ? googleOAuthClientId.trim() : null,
    };
  }
}
