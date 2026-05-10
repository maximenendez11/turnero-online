import { BadRequestException, Injectable } from '@nestjs/common';
import { DepositMode, Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { OnboardingSetupDto } from './dto/onboarding-setup.dto';

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async setup(dto: OnboardingSetupDto) {
    const baseSlug = this.slugify(dto.businessName);
    if (!baseSlug) {
      throw new BadRequestException('El nombre del negocio debe generar un slug válido');
    }
    const slug = await this.uniqueSlug(baseSlug);

    const depositMode = this.resolveDepositMode(dto);
    const depositValue =
      depositMode === DepositMode.none ? new Prisma.Decimal(0) : new Prisma.Decimal(dto.depositValue);

    const result = await this.prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: {
          slug,
          name: dto.businessName.trim(),
          description: dto.businessDescription?.trim() || null,
          address: dto.address.trim(),
          timezone: dto.timezone,
          currency: dto.currency,
          whatsapp: dto.whatsapp?.trim() || null,
          instagram: dto.instagram?.trim() || null,
          openingHours: dto.openingHours,
          bookingIntervalMin: dto.bookingIntervalMin,
          maxAppointmentsPerSlot: dto.maxAppointmentsPerSlot,
          status: 'active',
        },
        select: { id: true, slug: true },
      });

      const service = await tx.businessService.create({
        data: {
          businessId: business.id,
          name: dto.serviceName.trim(),
          description: dto.businessDescription?.trim() || null,
          durationMin: dto.serviceDurationMin,
          price: new Prisma.Decimal(dto.servicePrice),
          depositMode,
          depositValue,
          isActive: true,
        },
        select: { id: true },
      });

      const staff = await tx.staffMember.create({
        data: {
          businessId: business.id,
          fullName: 'Profesional principal',
          isActive: true,
        },
        select: { id: true },
      });

      await tx.staffService.create({
        data: { staffId: staff.id, serviceId: service.id },
      });

      return { businessId: business.id, slug: business.slug as string };
    });

    return result;
  }

  private resolveDepositMode(dto: OnboardingSetupDto): DepositMode {
    if (!dto.requiresDeposit || dto.depositMode === 'none') {
      return DepositMode.none;
    }
    if (dto.depositMode === 'fixed') {
      return DepositMode.fixed;
    }
    if (dto.depositMode === 'percent') {
      return DepositMode.percent;
    }
    return DepositMode.none;
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
