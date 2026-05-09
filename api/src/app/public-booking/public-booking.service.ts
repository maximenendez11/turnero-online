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
              { locality: { contains: query } },
              { neighborhood: { contains: query } },
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
        locality: true,
        neighborhood: true,
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
        currency: true,
        openingHours: true,
        bookingIntervalMin: true,
        maxAppointmentsPerSlot: true,
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
        depositMode: true,
        depositValue: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async getStaff(slug: string, serviceId?: string) {
    const business = await this.getBusinessBySlug(slug);
    return this.prisma.staffMember.findMany({
      where: {
        businessId: business.id,
        isActive: true,
        ...(serviceId ? { serviceLinks: { some: { serviceId } } } : {}),
      },
      select: {
        id: true,
        fullName: true,
        bio: true,
        avatarUrl: true,
      },
      orderBy: { fullName: 'asc' },
    });
  }

  async getAvailability(
    slug: string,
    serviceId: string,
    staffId: string,
    dateIso: string,
  ) {
    const business = await this.getBusinessBySlug(slug);
    const service = await this.prisma.businessService.findFirst({
      where: { id: serviceId, businessId: business.id, isActive: true },
      select: { durationMin: true },
    });
    if (!service) throw new NotFoundException('Service not found');

    const staff = await this.prisma.staffMember.findFirst({
      where: { id: staffId, businessId: business.id, isActive: true },
      select: { id: true },
    });
    if (!staff) throw new NotFoundException('Staff not found');

    const day = new Date(dateIso);
    if (Number.isNaN(day.getTime())) throw new BadRequestException('Invalid date');
    const startOfDay = new Date(day);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(day);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await this.prisma.booking.findMany({
      where: {
        businessId: business.id,
        staffId,
        startsAt: { gte: startOfDay, lte: endOfDay },
        status: { not: BookingStatus.cancelled },
      },
      select: { startsAt: true, durationMin: true },
    });

    const interval = Math.max(15, business.bookingIntervalMin || 30);
    const slots: string[] = [];
    const slotCursor = new Date(startOfDay);
    slotCursor.setHours(9, 0, 0, 0);
    const closeAt = new Date(startOfDay);
    closeAt.setHours(19, 0, 0, 0);

    while (slotCursor < closeAt) {
      const currentSlot = new Date(slotCursor);
      const currentEnd = new Date(currentSlot.getTime() + service.durationMin * 60_000);
      const overlaps = bookings.some((booking) => {
        const bookedStart = new Date(booking.startsAt);
        const bookedEnd = new Date(bookedStart.getTime() + booking.durationMin * 60_000);
        return currentSlot < bookedEnd && bookedStart < currentEnd;
      });
      if (!overlaps) slots.push(currentSlot.toISOString());
      slotCursor.setMinutes(slotCursor.getMinutes() + interval);
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

    const staff = await this.prisma.staffMember.findFirst({
      where: { id: dto.staffId, businessId: business.id, isActive: true },
      select: { id: true },
    });
    if (!staff) throw new NotFoundException('Staff not found');

    const startsAt = new Date(dto.startsAt);
    if (Number.isNaN(startsAt.getTime())) throw new BadRequestException('Invalid datetime');

    const code = `BK-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const booking = await this.prisma.booking.create({
      data: {
        code,
        businessId: business.id,
        serviceId: dto.serviceId,
        staffId: dto.staffId,
        customerName: dto.customerName,
        customerEmail: dto.customerEmail,
        customerPhone: dto.customerPhone,
        notes: dto.notes,
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
        staff: { select: { fullName: true } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }
}
