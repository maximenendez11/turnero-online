import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

export const PUBLIC_BOOKING_CONTACT_PURPOSE = 'public_booking_contact' as const;

export type BookingContactJwtPayload = {
  sub: string;
  purpose: typeof PUBLIC_BOOKING_CONTACT_PURPOSE;
  email: string;
  businessId: string;
  slug: string;
  name?: string;
};

@Injectable()
export class BookingContactTokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private secret(): string {
    const s = this.config.get<string>('bookingContact.jwtSecret')?.trim();
    if (!s && process.env.NODE_ENV === 'production') {
      throw new Error('BOOKING_CONTACT_JWT_SECRET o JWT_SECRET es obligatorio en producción');
    }
    return s || 'solo-desarrollo-booking-contact';
  }

  signToken(
    payload: Pick<BookingContactJwtPayload, 'email' | 'businessId' | 'slug'> & { name?: string },
  ): string {
    const full: BookingContactJwtPayload = {
      sub: payload.email,
      purpose: PUBLIC_BOOKING_CONTACT_PURPOSE,
      email: payload.email,
      businessId: payload.businessId,
      slug: payload.slug,
      ...(payload.name ? { name: payload.name } : {}),
    };
    const expiresIn = this.parseExpiresToSeconds(
      this.config.get<string>('bookingContact.jwtExpiresIn') ?? '15m',
    );
    return this.jwt.sign(full, { secret: this.secret(), expiresIn });
  }

  /** `jsonwebtoken` acepta segundos (number) sin depender del tipo `StringValue` de `ms`. */
  private parseExpiresToSeconds(value: string): number {
    const s = value.trim().toLowerCase();
    const m = /^(\d+)(s|m|h|d)$/.exec(s);
    if (!m) return 15 * 60;
    const n = parseInt(m[1], 10);
    const u = m[2];
    const mult = u === 's' ? 1 : u === 'm' ? 60 : u === 'h' ? 3600 : 86400;
    return n * mult;
  }

  verifyToken(token: string): BookingContactJwtPayload {
    try {
      const decoded = this.jwt.verify(token, { secret: this.secret() }) as BookingContactJwtPayload;
      if (decoded.purpose !== PUBLIC_BOOKING_CONTACT_PURPOSE) {
        throw new UnauthorizedException('Token inválido');
      }
      if (!decoded.email || !decoded.businessId || !decoded.slug) {
        throw new UnauthorizedException('Token incompleto');
      }
      return decoded;
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException('Verificación de contacto inválida o vencida');
    }
  }
}
