import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePublicBookingDto } from './dto/create-public-booking.dto';

@Injectable()
export class PublicBookingService {
  constructor(private readonly prisma: PrismaService) {}

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
      },
    });
    if (!business) throw new NotFoundException('Business not found');
    return business;
  }

  async getServices(slug: string) {
    const business = await this.getBusinessBySlug(slug);
    return this.prisma.businessService.findMany({
      where: { businessId: business.id, isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        durationMin: true,
        price: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async getAvailability(slug: string, serviceId: string, dateIso: string) {
    const business = await this.getBusinessBySlug(slug);
    const service = await this.prisma.businessService.findFirst({
      where: { id: serviceId, businessId: business.id, isActive: true },
      select: { durationMin: true },
    });
    if (!service) throw new NotFoundException('Service not found');

    const day = new Date(dateIso);
    if (Number.isNaN(day.getTime())) throw new BadRequestException('Invalid date');

    const weekday = day.getDay();
    const windows = await this.prisma.businessOpeningWindow.findMany({
      where: { businessId: business.id, weekday },
      orderBy: [{ sortOrder: 'asc' }, { startMin: 'asc' }],
    });

    const startOfDay = this.startOfLocalDay(day);
    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);

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
        const slotStart = this.atMinutesOnLocalDay(day, cursorMin);
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
    const business = await this.getBusinessBySlug(slug);
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
        customerContact: dto.customerContact.trim(),
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
    const business = await this.getBusinessBySlug(slug);
    const booking = await this.prisma.booking.findFirst({
      where: { businessId: business.id, code },
      include: {
        service: { select: { name: true, durationMin: true } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  private startOfLocalDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  }

  /** Minutos desde 00:00 del mismo día calendario local que `d`. */
  private atMinutesOnLocalDay(d: Date, minutesFromMidnight: number): Date {
    const base = this.startOfLocalDay(d);
    const out = new Date(base);
    out.setMinutes(out.getMinutes() + minutesFromMidnight);
    return out;
  }
}
