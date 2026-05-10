import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/jwt-payload.types';
import type { PatchBusinessAdminDto } from './dto/patch-business-admin.dto';
import type { ReplaceOpeningWindowsDto } from './dto/replace-opening-windows.dto';
import type { CreateServiceAdminDto, PatchServiceAdminDto } from './dto/patch-service-admin.dto';
import type { PatchBookingAdminDto } from './dto/patch-booking-admin.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listBusinesses(user: JwtPayload) {
    if (user.role === 'ADMIN') {
      return this.prisma.business.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          ownerUserId: true,
          address: true,
          timezone: true,
          bookingIntervalMin: true,
        },
        orderBy: { name: 'asc' },
      });
    }
    await this.claimOrphanBusinessForUser(user);
    return this.prisma.business.findMany({
      where: { deletedAt: null, ownerUserId: user.sub },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        ownerUserId: true,
        address: true,
        timezone: true,
        bookingIntervalMin: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async getBusinessDetail(user: JwtPayload, businessId: string) {
    await this.assertBusinessAccess(user, businessId);
    const business = await this.prisma.business.findFirst({
      where: { id: businessId, deletedAt: null },
      include: {
        openingWindows: { orderBy: [{ weekday: 'asc' }, { sortOrder: 'asc' }, { startMin: 'asc' }] },
        services: { orderBy: { name: 'asc' } },
      },
    });
    if (!business) throw new NotFoundException('Negocio no encontrado');
    return business;
  }

  async patchBusiness(user: JwtPayload, businessId: string, dto: PatchBusinessAdminDto) {
    await this.assertBusinessAccess(user, businessId);
    if (dto.slug !== undefined) {
      const slug = dto.slug.trim();
      if (slug) {
        const clash = await this.prisma.business.findFirst({
          where: { slug, deletedAt: null, NOT: { id: businessId } },
          select: { id: true },
        });
        if (clash) throw new ConflictException('El slug ya está en uso');
      }
    }
    const data: Prisma.BusinessUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.slug !== undefined) data.slug = dto.slug.trim() || null;
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.address !== undefined) data.address = dto.address.trim();
    if (dto.timezone !== undefined) data.timezone = dto.timezone.trim();
    if (dto.bookingIntervalMin !== undefined) data.bookingIntervalMin = dto.bookingIntervalMin;
    if (dto.status !== undefined) data.status = dto.status;
    if (Object.keys(data).length === 0) {
      return this.getBusinessDetail(user, businessId);
    }
    await this.prisma.business.update({ where: { id: businessId }, data });
    return this.getBusinessDetail(user, businessId);
  }

  async replaceOpeningWindows(user: JwtPayload, businessId: string, dto: ReplaceOpeningWindowsDto) {
    await this.assertBusinessAccess(user, businessId);
    for (const w of dto.windows) {
      if (w.endMin <= w.startMin) {
        throw new BadRequestException(`Ventana inválida: weekday ${w.weekday} endMin debe ser mayor que startMin`);
      }
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.businessOpeningWindow.deleteMany({ where: { businessId } });
      if (dto.windows.length === 0) return;
      await tx.businessOpeningWindow.createMany({
        data: dto.windows.map((w) => ({
          businessId,
          weekday: w.weekday,
          startMin: w.startMin,
          endMin: w.endMin,
          sortOrder: w.sortOrder,
        })),
      });
    });
    return this.getBusinessDetail(user, businessId);
  }

  async createService(user: JwtPayload, businessId: string, dto: CreateServiceAdminDto) {
    await this.assertBusinessAccess(user, businessId);
    return this.prisma.businessService.create({
      data: {
        businessId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        durationMin: dto.durationMin,
        price: new Prisma.Decimal(dto.price),
        isActive: true,
      },
    });
  }

  async patchService(user: JwtPayload, serviceId: string, dto: PatchServiceAdminDto) {
    const service = await this.prisma.businessService.findFirst({
      where: { id: serviceId },
      select: { businessId: true },
    });
    if (!service) throw new NotFoundException('Servicio no encontrado');
    await this.assertBusinessAccess(user, service.businessId);
    const data: Prisma.BusinessServiceUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.durationMin !== undefined) data.durationMin = dto.durationMin;
    if (dto.price !== undefined) data.price = new Prisma.Decimal(dto.price);
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    return this.prisma.businessService.update({ where: { id: serviceId }, data });
  }

  async listBookings(user: JwtPayload, businessId?: string) {
    const ids = await this.accessibleBusinessIds(user);
    if (ids.length === 0) return [];
    let filterIds = ids;
    if (businessId) {
      if (!ids.includes(businessId)) throw new ForbiddenException();
      filterIds = [businessId];
    }
    return this.prisma.booking.findMany({
      where: { businessId: { in: filterIds } },
      include: {
        service: { select: { id: true, name: true } },
        business: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { startsAt: 'desc' },
      take: 500,
    });
  }

  async patchBooking(user: JwtPayload, bookingId: string, dto: PatchBookingAdminDto) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId },
      select: { businessId: true },
    });
    if (!booking) throw new NotFoundException('Turno no encontrado');
    await this.assertBusinessAccess(user, booking.businessId);
    let serviceDuration: number | undefined;
    if (dto.serviceId) {
      const svc = await this.prisma.businessService.findFirst({
        where: { id: dto.serviceId, businessId: booking.businessId, isActive: true },
        select: { durationMin: true },
      });
      if (!svc) throw new BadRequestException('Servicio no válido para este negocio');
      serviceDuration = svc.durationMin;
    }
    const data: Prisma.BookingUpdateInput = {};
    if (dto.serviceId !== undefined) {
      data.service = { connect: { id: dto.serviceId } };
      if (dto.durationMin === undefined) data.durationMin = serviceDuration!;
    }
    if (dto.customerFullName !== undefined) data.customerFullName = dto.customerFullName.trim();
    if (dto.customerContact !== undefined) data.customerContact = dto.customerContact.trim();
    if (dto.startsAt !== undefined) {
      const d = new Date(dto.startsAt);
      if (Number.isNaN(d.getTime())) throw new BadRequestException('startsAt inválido');
      data.startsAt = d;
    }
    if (dto.durationMin !== undefined) data.durationMin = dto.durationMin;
    if (dto.status !== undefined) data.status = dto.status;
    return this.prisma.booking.update({
      where: { id: bookingId },
      data,
      include: { service: { select: { name: true } }, business: { select: { name: true, slug: true } } },
    });
  }

  private async accessibleBusinessIds(user: JwtPayload): Promise<string[]> {
    if (user.role === 'ADMIN') {
      const rows = await this.prisma.business.findMany({
        where: { deletedAt: null },
        select: { id: true },
      });
      return rows.map((r) => r.id);
    }
    await this.claimOrphanBusinessForUser(user);
    const rows = await this.prisma.business.findMany({
      where: { deletedAt: null, ownerUserId: user.sub },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  /**
   * Negocios legacy sin `owner_user_id`: el primer usuario que consulta el admin
   * y aún no tiene ningún negocio asignado pasa a ser dueño del más antiguo sin dueño.
   * (Evita pantalla vacía tras migraciones / datos viejos.)
   */
  private async claimOrphanBusinessForUser(user: JwtPayload): Promise<void> {
    if (user.role === 'ADMIN') return;
    const owned = await this.prisma.business.count({
      where: { deletedAt: null, ownerUserId: user.sub },
    });
    if (owned > 0) return;
    const orphan = await this.prisma.business.findFirst({
      where: { deletedAt: null, ownerUserId: null },
      orderBy: { createdAt: 'asc' },
    });
    if (!orphan) return;
    await this.prisma.business.update({
      where: { id: orphan.id },
      data: { ownerUserId: user.sub },
    });
  }

  private async assertBusinessAccess(user: JwtPayload, businessId: string): Promise<void> {
    const ids = await this.accessibleBusinessIds(user);
    if (!ids.includes(businessId)) throw new ForbiddenException('Sin acceso a este negocio');
  }
}
