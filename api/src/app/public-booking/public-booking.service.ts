import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  jsWeekdayInBusinessZone,
  parseIsoDateOnly,
  utcInstantForZonedMinutes,
  zonedBusinessDayRange,
} from './availability-calendar.utils';
import { CreatePublicBookingDto } from './dto/create-public-booking.dto';
import { BookingContactTokenService } from './booking-contact-token.service';

@Injectable()
export class PublicBookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingContactTokens: BookingContactTokenService,
  ) {}

  async searchBusinesses(query?: string) {
    const where: Prisma.BusinessWhereInput = {
      status: 'active',
      deletedAt: null,
      ...(query
        ? {
            OR: [
              { name: { contains: query } },
              { description: { contains: query } },
              { address: { contains: query } },
            ],
          }
        : {}),
    };

    return this.prisma.business.findMany({
      where,
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        address: true,
      },
      orderBy: { name: 'asc' },
      take: 20,
    });
  }

  /**
   * Ficha pública del negocio para la landing y el flujo de reserva: incluye servicios y equipo.
   */
  async getBusinessBySlug(slug: string) {
    const business = await this.prisma.business.findFirst({
      where: { slug, status: 'active', deletedAt: null },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        address: true,
        timezone: true,
        bookingIntervalMin: true,
        themeBackgroundHex: true,
        themePrimaryHex: true,
        bannerImageUrl: true,
        ratingAverage: true,
        ratingCount: true,
        services: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            description: true,
            durationMin: true,
            price: true,
            priceOnRequest: true,
            imageUrl: true,
            imageUrl2: true,
            imageUrl3: true,
          },
          orderBy: { name: 'asc' },
        },
        staff: {
          select: { id: true, displayName: true, role: true, photoUrl: true },
          orderBy: [{ sortOrder: 'asc' }, { displayName: 'asc' }],
        },
      },
    });
    if (!business) throw new NotFoundException('Business not found');
    return {
      id: business.id,
      slug: business.slug,
      name: business.name,
      description: business.description,
      address: business.address,
      timezone: business.timezone,
      bookingIntervalMin: business.bookingIntervalMin,
      themeBackgroundHex: business.themeBackgroundHex,
      themePrimaryHex: business.themePrimaryHex,
      bannerImageUrl: business.bannerImageUrl,
      ratingAverage: business.ratingAverage,
      ratingCount: business.ratingCount,
      services: business.services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        durationMin: s.durationMin,
        price: s.price.toString(),
        priceOnRequest: s.priceOnRequest,
        imageUrl: s.imageUrl,
        imageUrl2: s.imageUrl2,
        imageUrl3: s.imageUrl3,
      })),
      staff: business.staff,
    };
  }

  private async requireActiveBusinessBySlug(slug: string) {
    const business = await this.prisma.business.findFirst({
      where: { slug, status: 'active', deletedAt: null },
      select: { id: true, timezone: true, bookingIntervalMin: true },
    });
    if (!business) throw new NotFoundException('Business not found');
    return business;
  }

  async getServices(slug: string) {
    const business = await this.requireActiveBusinessBySlug(slug);
    const rows = await this.prisma.businessService.findMany({
      where: { businessId: business.id, isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        durationMin: true,
        price: true,
        priceOnRequest: true,
        imageUrl: true,
        imageUrl2: true,
        imageUrl3: true,
      },
      orderBy: { name: 'asc' },
    });
    return rows.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      durationMin: s.durationMin,
      price: s.price.toString(),
      priceOnRequest: s.priceOnRequest,
      imageUrl: s.imageUrl,
      imageUrl2: s.imageUrl2,
      imageUrl3: s.imageUrl3,
    }));
  }

  async getAvailability(slug: string, serviceId: string, dateIso: string) {
    const business = await this.requireActiveBusinessBySlug(slug);
    const service = await this.prisma.businessService.findFirst({
      where: { id: serviceId, businessId: business.id, isActive: true },
      select: { durationMin: true },
    });
    if (!service) throw new NotFoundException('Service not found');

    const cal = parseIsoDateOnly(dateIso);
    if (!cal) throw new BadRequestException('Invalid date');

    /** Misma convención que la UI/admin: 0=dom … 6=sáb, pero usando el calendario del negocio (no `Date('YYYY-MM-DD')` en UTC). */
    const weekday = jsWeekdayInBusinessZone(cal.y, cal.m, cal.d, business.timezone);
    const windows = await this.prisma.businessOpeningWindow.findMany({
      where: { businessId: business.id, weekday },
      orderBy: [{ sortOrder: 'asc' }, { startMin: 'asc' }],
    });

    const { start: startOfDay, end: endOfDay } = zonedBusinessDayRange(cal.y, cal.m, cal.d, business.timezone);

    const bookings = await this.prisma.booking.findMany({
      where: {
        businessId: business.id,
        startsAt: { gte: startOfDay, lte: endOfDay },
        status: { not: BookingStatus.cancelled },
      },
      select: { startsAt: true, durationMin: true },
    });

    const interval = Math.max(15, business.bookingIntervalMin || 30);
    const slots: string[] = [];

    for (const w of windows) {
      for (let cursorMin = w.startMin; cursorMin + service.durationMin <= w.endMin; cursorMin += interval) {
        const slotStart = utcInstantForZonedMinutes(cal.y, cal.m, cal.d, cursorMin, business.timezone);
        const slotEnd = new Date(slotStart.getTime() + service.durationMin * 60_000);
        const overlaps = bookings.some((booking) => {
          const bookedStart = new Date(booking.startsAt);
          const bookedEnd = new Date(bookedStart.getTime() + booking.durationMin * 60_000);
          return slotStart < bookedEnd && bookedStart < slotEnd;
        });
        if (!overlaps) {
          slots.push(slotStart.toISOString());
        }
      }
    }

    return { slots };
  }

  async createBooking(slug: string, dto: CreatePublicBookingDto) {
    const business = await this.requireActiveBusinessBySlug(slug);
    const claims = this.bookingContactTokens.verifyToken(dto.bookingContactToken);
    if (claims.businessId !== business.id || claims.slug !== slug) {
      throw new UnauthorizedException('El contacto verificado no corresponde a este comercio.');
    }

    const service = await this.prisma.businessService.findFirst({
      where: { id: dto.serviceId, businessId: business.id, isActive: true },
      select: { durationMin: true },
    });
    if (!service) throw new NotFoundException('Service not found');

    const startsAt = new Date(dto.startsAt);
    if (Number.isNaN(startsAt.getTime())) throw new BadRequestException('Invalid datetime');

    const code = `BK-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const booking = await this.prisma.booking.create({
      data: {
        code,
        businessId: business.id,
        serviceId: dto.serviceId,
        customerFullName: dto.customerFullName.trim(),
        customerContact: claims.email,
        startsAt,
        durationMin: service.durationMin,
        status: BookingStatus.confirmed,
      },
      select: {
        code: true,
        startsAt: true,
        durationMin: true,
      },
    });

    return booking;
  }

  async getBooking(slug: string, code: string) {
    const business = await this.requireActiveBusinessBySlug(slug);
    const booking = await this.prisma.booking.findFirst({
      where: { businessId: business.id, code },
      include: {
        service: { select: { name: true, durationMin: true } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

}
