import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { BookingContactTokenService } from './booking-contact-token.service';

@Injectable()
export class BookingContactService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly tokens: BookingContactTokenService,
    private readonly config: ConfigService,
  ) {}

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private async requireActiveBusinessForContact(slug: string) {
    const business = await this.prisma.business.findFirst({
      where: { slug, status: 'active', deletedAt: null },
      select: { id: true, slug: true, name: true },
    });
    if (!business?.slug) throw new NotFoundException('Business not found');
    return { id: business.id, slug: business.slug, name: business.name };
  }

  async sendEmailCode(slug: string, emailRaw: string) {
    const email = this.normalizeEmail(emailRaw);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Email inválido');
    }

    const business = await this.requireActiveBusinessForContact(slug);
    const nodeEnv = process.env.NODE_ENV ?? 'development';

    if (nodeEnv === 'production' && !this.mail.isConfigured()) {
      throw new ServiceUnavailableException(
        'No se pueden enviar códigos por correo en este momento. Probá más tarde o contactá al comercio.',
      );
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await bcrypt.hash(code, 10);
    const otpMinutes = this.config.get<number>('bookingContact.otpExpiresMinutes') ?? 15;
    const expiresAt = new Date(Date.now() + otpMinutes * 60_000);

    await this.prisma.bookingContactOtp.deleteMany({
      where: { businessId: business.id, email },
    });

    await this.prisma.bookingContactOtp.create({
      data: {
        businessId: business.id,
        email,
        codeHash,
        expiresAt,
      },
    });

    await this.mail.sendBookingOtp(email, code, business.name);

    return { ok: true as const };
  }

  async verifyEmailCode(slug: string, emailRaw: string, codeRaw: string) {
    const email = this.normalizeEmail(emailRaw);
    const code = codeRaw.trim();
    if (code.length < 4) throw new BadRequestException('Código inválido');

    const business = await this.requireActiveBusinessForContact(slug);
    const maxAttempts = this.config.get<number>('bookingContact.otpMaxAttempts') ?? 5;

    const otp = await this.prisma.bookingContactOtp.findFirst({
      where: { businessId: business.id, email },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp || otp.expiresAt < new Date()) {
      throw new UnauthorizedException('Código vencido o inexistente. Pedí uno nuevo.');
    }

    if (otp.attempts >= maxAttempts) {
      await this.prisma.bookingContactOtp.delete({ where: { id: otp.id } });
      throw new UnauthorizedException('Demasiados intentos. Pedí un código nuevo.');
    }

    const match = await bcrypt.compare(code, otp.codeHash);
    if (!match) {
      await this.prisma.bookingContactOtp.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Código incorrecto.');
    }

    await this.prisma.bookingContactOtp.delete({ where: { id: otp.id } });

    const bookingContactToken = this.tokens.signToken({
      email,
      businessId: business.id,
      slug: business.slug,
    });

    return { bookingContactToken, email };
  }

  async verifyGoogle(slug: string, idToken: string) {
    const trimmed = idToken.trim();
    if (!trimmed) throw new BadRequestException('Token de Google requerido');

    const clientId = this.config.get<string>('google.oauthClientId')?.trim() ?? '';
    if (!clientId) {
      throw new ServiceUnavailableException('Inicio de sesión con Google no está configurado.');
    }

    const business = await this.requireActiveBusinessForContact(slug);
    const client = new OAuth2Client(clientId);
    let email: string;
    let name: string | undefined;
    try {
      const ticket = await client.verifyIdToken({
        idToken: trimmed,
        audience: clientId,
      });
      const payload = ticket.getPayload();
      if (!payload?.email) {
        throw new UnauthorizedException('No se pudo verificar el email con Google.');
      }
      if (payload.email_verified === false) {
        throw new UnauthorizedException('El email de Google no está verificado.');
      }
      email = this.normalizeEmail(payload.email);
      name = typeof payload.name === 'string' ? payload.name : undefined;
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException('Token de Google inválido.');
    }

    const bookingContactToken = this.tokens.signToken({
      email,
      businessId: business.id,
      slug: business.slug,
      name,
    });

    return { bookingContactToken, email, name: name ?? null };
  }
}
