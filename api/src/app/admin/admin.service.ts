import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import type { Request } from 'express';
import { mkdir, writeFile } from 'fs/promises';
import imageSize from 'image-size';
import { join } from 'path';
import { DateTime } from 'luxon';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/jwt-payload.types';
import type { PatchBusinessAdminDto } from './dto/patch-business-admin.dto';
import type { ReplaceOpeningWindowsDto } from './dto/replace-opening-windows.dto';
import type { CreateServiceAdminDto, PatchServiceAdminDto } from './dto/patch-service-admin.dto';
import type { PatchBookingAdminDto } from './dto/patch-booking-admin.dto';
import type { CreateStaffAdminDto, PatchStaffAdminDto } from './dto/staff-admin.dto';
import { publicBaseUrlFromRequest } from './public-base-url';
import { getUploadsDir } from '../../uploads-path';

export type AdminDashboardMetricsByBusiness = {
  businessId: string;
  businessName: string;
  timeZone: string;
  /** Turnos con estado `confirmed` cuyo `startsAt` cae en el día civil actual del negocio. */
  todayConfirmed: number;
};

export type AdminDashboardMetrics = {
  generatedAt: string;
  /** Suma de confirmados hoy en todos los negocios accesibles. */
  todayConfirmed: number;
  byBusiness: AdminDashboardMetricsByBusiness[];
};

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
        staff: { orderBy: [{ sortOrder: 'asc' }, { displayName: 'asc' }] },
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
    if (dto.themeBackgroundHex !== undefined) {
      const t = dto.themeBackgroundHex.trim();
      data.themeBackgroundHex = t === '' ? null : t.toLowerCase();
    }
    if (dto.themePrimaryHex !== undefined) {
      const t = dto.themePrimaryHex.trim();
      data.themePrimaryHex = t === '' ? null : t.toLowerCase();
    }
    if (dto.bannerImageUrl !== undefined) {
      const u = dto.bannerImageUrl.trim();
      data.bannerImageUrl = u === '' ? null : u;
    }
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
        imageUrl: dto.imageUrl?.trim() || null,
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
    if (dto.imageUrl !== undefined) {
      const u = dto.imageUrl.trim();
      data.imageUrl = u === '' ? null : u;
    }
    if (Object.keys(data).length === 0) {
      return this.prisma.businessService.findFirstOrThrow({ where: { id: serviceId } });
    }
    return this.prisma.businessService.update({ where: { id: serviceId }, data });
  }

  async createStaffMember(user: JwtPayload, businessId: string, dto: CreateStaffAdminDto) {
    await this.assertBusinessAccess(user, businessId);
    return this.prisma.businessStaff.create({
      data: {
        businessId,
        displayName: dto.displayName.trim(),
        role: dto.role?.trim() || null,
        photoUrl: dto.photoUrl?.trim() || null,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async patchStaffMember(user: JwtPayload, staffId: string, dto: PatchStaffAdminDto) {
    const row = await this.prisma.businessStaff.findFirst({
      where: { id: staffId },
      select: { businessId: true },
    });
    if (!row) throw new NotFoundException('Profesional no encontrado');
    await this.assertBusinessAccess(user, row.businessId);
    const data: Prisma.BusinessStaffUpdateInput = {};
    if (dto.displayName !== undefined) data.displayName = dto.displayName.trim();
    if (dto.role !== undefined) data.role = dto.role.trim() === '' ? null : dto.role.trim();
    if (dto.photoUrl !== undefined) {
      const u = dto.photoUrl.trim();
      data.photoUrl = u === '' ? null : u;
    }
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (Object.keys(data).length === 0) {
      return this.prisma.businessStaff.findFirstOrThrow({ where: { id: staffId } });
    }
    return this.prisma.businessStaff.update({ where: { id: staffId }, data });
  }

  async deleteStaffMember(user: JwtPayload, staffId: string): Promise<{ ok: boolean }> {
    const row = await this.prisma.businessStaff.findFirst({
      where: { id: staffId },
      select: { businessId: true },
    });
    if (!row) throw new NotFoundException('Profesional no encontrado');
    await this.assertBusinessAccess(user, row.businessId);
    await this.prisma.businessStaff.delete({ where: { id: staffId } });
    return { ok: true };
  }

  /**
   * Sube imagen para vitrina (cabecera o foto de profesional). Devuelve URL absoluta lista para guardar en BD.
   */
  async uploadLandingMedia(
    user: JwtPayload,
    businessId: string,
    file: { buffer: Buffer; mimetype: string } | undefined,
    kindRaw: string,
    req: Request,
  ): Promise<{ url: string }> {
    await this.assertBusinessAccess(user, businessId);
    if (!file?.buffer?.length) {
      throw new BadRequestException('Seleccioná un archivo de imagen');
    }
    const kind = kindRaw === 'banner' || kindRaw === 'staff' ? kindRaw : null;
    if (!kind) {
      throw new BadRequestException('Parámetro kind inválido (usá banner o staff)');
    }
    const mime = (file.mimetype || '').toLowerCase();
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!allowed.has(mime)) {
      throw new BadRequestException('Formato no permitido. Usá JPG, PNG o WebP.');
    }
    const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';

    let width = 0;
    let height = 0;
    try {
      const dim = imageSize(file.buffer);
      width = dim.width ?? 0;
      height = dim.height ?? 0;
    } catch {
      throw new BadRequestException('No se pudo leer la imagen');
    }
    const maxSide = kind === 'banner' ? 8000 : 5000;
    if (width > maxSide || height > maxSide) {
      throw new BadRequestException(`La imagen supera el tamaño máximo permitido (${maxSide}px por lado)`);
    }

    const filename = `${randomBytes(12).toString('hex')}.${ext}`;
    const dir = join(getUploadsDir(), 'businesses', businessId);
    await mkdir(dir, { recursive: true });
    const absPath = join(dir, filename);
    await writeFile(absPath, file.buffer);

    const base = publicBaseUrlFromRequest(req);
    const url = `${base}/api/media/businesses/${businessId}/${filename}`;
    if (url.length > 2048) {
      throw new BadRequestException('URL resultante demasiado larga');
    }
    return { url };
  }

  /**
   * Confirmados hoy por negocio: "hoy" = día civil en la zona del negocio; filtro `status === confirmed`.
   */
  async getDashboardMetrics(user: JwtPayload): Promise<AdminDashboardMetrics> {
    const ids = await this.accessibleBusinessIds(user);
    const empty: AdminDashboardMetrics = {
      generatedAt: new Date().toISOString(),
      todayConfirmed: 0,
      byBusiness: [],
    };
    if (ids.length === 0) return empty;

    const businesses = await this.prisma.business.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true, name: true, timezone: true },
      orderBy: { name: 'asc' },
    });

    const byBusiness = await Promise.all(
      businesses.map((b) => this.todayConfirmedForBusiness(b.id, b.name, b.timezone)),
    );

    const todayConfirmed = byBusiness.reduce((a, x) => a + x.todayConfirmed, 0);

    return { generatedAt: new Date().toISOString(), todayConfirmed, byBusiness };
  }

  private async todayConfirmedForBusiness(
    businessId: string,
    businessName: string,
    timezone: string | null,
  ): Promise<AdminDashboardMetricsByBusiness> {
    const rawTz = timezone?.trim() || 'America/Argentina/Buenos_Aires';
    let zonedNow: DateTime;
    try {
      zonedNow = DateTime.now().setZone(rawTz);
      if (!zonedNow.isValid) throw new Error('invalid tz');
    } catch {
      zonedNow = DateTime.now().setZone('America/Argentina/Buenos_Aires');
    }

    const dayStartUtc = zonedNow.startOf('day').toUTC();
    const dayEndUtc = dayStartUtc.plus({ days: 1 });

    const todayConfirmed = await this.prisma.booking.count({
      where: {
        businessId,
        status: 'confirmed',
        startsAt: { gte: dayStartUtc.toJSDate(), lt: dayEndUtc.toJSDate() },
      },
    });

    return {
      businessId,
      businessName,
      timeZone: zonedNow.zoneName || rawTz,
      todayConfirmed,
    };
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
