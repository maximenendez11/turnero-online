import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import {
  jsWeekdayInBusinessZone,
  parseIsoDateOnly,
  utcInstantForZonedMinutes,
  zonedBusinessDayRange,
} from './availability-calendar.utils';
import { CreatePublicBookingDto } from './dto/create-public-booking.dto';
import { BookingContactTokenService } from './booking-contact-token.service';
import { haversineKm, parseCoord } from './geo-distance.utils';

@Injectable()
export class PublicBookingService {
  private readonly logger = new Logger(PublicBookingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingContactTokens: BookingContactTokenService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async searchBusinesses(opts: {
    query?: string;
    category?: string;
    lat?: string;
    lng?: string;
    radiusKm?: string;
  }) {
    const q = opts.query?.trim();
    const cat = opts.category?.trim().toLowerCase();
    const centerLat = parseCoord(opts.lat);
    const centerLng = parseCoord(opts.lng);
    const radius = parseCoord(opts.radiusKm) ?? 10;
    const hasGeoCenter = centerLat != null && centerLng != null;
    const hasTextFilter = !!q || (!!cat && cat !== 'all');

    const where: Prisma.BusinessWhereInput = {
      status: 'active',
      deletedAt: null,
      ...(cat && cat !== 'all' ? { category: cat } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { description: { contains: q } },
              { address: { contains: q } },
              { category: { contains: q } },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.business.findMany({
      where,
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        address: true,
        category: true,
        latitude: true,
        longitude: true,
        ratingAverage: true,
        ratingCount: true,
        bannerImageUrl: true,
      },
      take: 100,
    });

    if (!hasGeoCenter) {
      return rows.map((r) => ({ ...r, distanceKm: null as number | null }));
    }

    const withDistance = rows.map((r) => {
      const hasCoords =
        typeof r.latitude === 'number' &&
        typeof r.longitude === 'number' &&
        Number.isFinite(r.latitude) &&
        Number.isFinite(r.longitude);
      const distanceKm = hasCoords
        ? haversineKm(centerLat, centerLng, r.latitude as number, r.longitude as number)
        : null;
      return { ...r, distanceKm };
    });

    if (!hasTextFilter) {
      const inRadius = withDistance
        .filter((r) => r.distanceKm != null && r.distanceKm <= radius)
        .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
      const pendingGeocode = withDistance
        .filter((r) => r.distanceKm == null)
        .slice(0, 20);
      return [...inRadius, ...pendingGeocode].slice(0, 50);
    }

    return withDistance
      .filter((r) => r.distanceKm == null || r.distanceKm <= radius)
      .sort((a, b) => {
        if (a.distanceKm == null && b.distanceKm == null) return a.name.localeCompare(b.name);
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      })
      .slice(0, 50);
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
        socialWhatsappUrl: true,
        socialInstagramUrl: true,
        socialFacebookUrl: true,
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
          where: { showOnLanding: true },
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
      socialWhatsappUrl: business.socialWhatsappUrl,
      socialInstagramUrl: business.socialInstagramUrl,
      socialFacebookUrl: business.socialFacebookUrl,
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
        customerContact: claims.email.trim().toLowerCase(),
        startsAt,
        durationMin: service.durationMin,
        status: BookingStatus.confirmed,
      },
      include: {
        service: { select: { name: true, durationMin: true, price: true, priceOnRequest: true } },
        business: {
          select: { name: true, slug: true, address: true, timezone: true, themePrimaryHex: true },
        },
      },
    });

    const publicBase = this.config.get<string>('publicAppUrl') ?? 'http://localhost:4200';
    const manageUrl = `${publicBase}/${encodeURIComponent(slug)}/manage/${encodeURIComponent(booking.code)}`;
    const tz = booking.business.timezone || 'America/Argentina/Buenos_Aires';
    const whenLine = this.capitalizeEs(
      new Intl.DateTimeFormat('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: tz,
      }).format(booking.startsAt),
    );
    const priceLine = this.formatServicePriceLine(booking.service);

    void this.mail
      .sendBookingConfirmed({
        to: claims.email,
        businessName: booking.business.name,
        businessAddress: booking.business.address,
        customerName: dto.customerFullName.trim(),
        serviceName: booking.service.name,
        durationMin: booking.service.durationMin,
        priceLine,
        whenLine,
        timezoneLabel: tz,
        bookingCode: booking.code,
        manageUrl,
        brandPrimaryHex: booking.business.themePrimaryHex,
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`No se pudo enviar el correo de confirmación del turno ${booking.code}: ${msg}`);
      });

    return {
      code: booking.code,
      startsAt: booking.startsAt,
      durationMin: booking.durationMin,
    };
  }

  private capitalizeEs(s: string): string {
    if (!s) return s;
    return s.charAt(0).toLocaleUpperCase('es') + s.slice(1);
  }

  private formatServicePriceLine(service: { price: unknown; priceOnRequest: boolean }): string {
    if (service.priceOnRequest) return 'Precio a consultar';
    const n = Number(service.price as string | number);
    if (Number.isNaN(n)) return '—';
    try {
      return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n);
    } catch {
      return String(n);
    }
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
