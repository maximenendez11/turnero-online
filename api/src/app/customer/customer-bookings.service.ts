import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/jwt-payload.types';

@Injectable()
export class CustomerBookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(user: JwtPayload) {
    const email = user.email.trim().toLowerCase();
    const rows = await this.prisma.booking.findMany({
      where: {
        customerContact: email,
        business: { status: 'active', deletedAt: null },
      },
      orderBy: { startsAt: 'desc' },
      take: 50,
      select: {
        id: true,
        code: true,
        startsAt: true,
        durationMin: true,
        status: true,
        customerFullName: true,
        business: { select: { slug: true, name: true } },
        service: { select: { name: true } },
      },
    });

    return rows.map((b) => ({
      id: b.id,
      code: b.code,
      startsAt: b.startsAt,
      durationMin: b.durationMin,
      status: b.status,
      customerFullName: b.customerFullName,
      businessSlug: b.business.slug,
      businessName: b.business.name,
      serviceName: b.service.name,
    }));
  }
}
