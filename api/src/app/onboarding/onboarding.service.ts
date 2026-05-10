import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { OnboardingSetupDto } from './dto/onboarding-setup.dto';

/** Lun–Vie 09:00–18:00 (minutos desde medianoche), mismo horario que seed demo. */
const DEFAULT_WEEKDAYS = [1, 2, 3, 4, 5] as const;
const DEFAULT_START_MIN = 9 * 60;
const DEFAULT_END_MIN = 18 * 60;

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async setup(dto: OnboardingSetupDto, ownerUserId: string) {
    if (!ownerUserId?.trim()) {
      throw new BadRequestException('Sesión inválida: no se pudo determinar el usuario');
    }
    const owner = await this.prisma.user.findFirst({
      where: { id: ownerUserId, deletedAt: null },
      select: { id: true },
    });
    if (!owner) {
      throw new BadRequestException('Usuario no encontrado');
    }
    const baseSlug = this.slugify(dto.businessName);
    if (!baseSlug) {
      throw new BadRequestException('El nombre del negocio debe generar un slug válido');
    }
    const slug = await this.uniqueSlug(baseSlug);

    const result = await this.prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: {
          slug,
          name: dto.businessName.trim(),
          description: dto.businessDescription?.trim() || null,
          address: dto.address.trim(),
          timezone: dto.timezone,
          bookingIntervalMin: dto.bookingIntervalMin,
          status: 'active',
          owner: { connect: { id: owner.id } },
        },
        select: { id: true, slug: true },
      });

      await tx.businessService.create({
        data: {
          businessId: business.id,
          name: dto.serviceName.trim(),
          description: dto.businessDescription?.trim() || null,
          durationMin: dto.serviceDurationMin,
          price: new Prisma.Decimal(dto.servicePrice),
          isActive: true,
        },
      });

      for (const weekday of DEFAULT_WEEKDAYS) {
        await tx.businessOpeningWindow.create({
          data: {
            businessId: business.id,
            weekday,
            startMin: DEFAULT_START_MIN,
            endMin: DEFAULT_END_MIN,
            sortOrder: 0,
          },
        });
      }

      return { businessId: business.id, slug: business.slug as string };
    });

    return result;
  }

  private slugify(text: string): string {
    return text
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async uniqueSlug(base: string): Promise<string> {
    for (let i = 0; i < 8; i++) {
      const candidate = i === 0 ? base : `${base}-${randomBytes(2).toString('hex')}`;
      const clash = await this.prisma.business.findFirst({
        where: { slug: candidate, deletedAt: null },
        select: { id: true },
      });
      if (!clash) {
        return candidate;
      }
    }
    throw new BadRequestException('No se pudo generar un slug único');
  }
}
