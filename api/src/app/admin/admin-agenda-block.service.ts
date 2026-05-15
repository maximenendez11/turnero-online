import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';
import { DateTime } from 'luxon';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/jwt-payload.types';
import type { CreateAgendaBlockAdminDto } from './dto/create-agenda-block-admin.dto';
import { MailService } from '../mail/mail.service';

type BookingWithServiceName = Prisma.BookingGetPayload<{
  include: { service: { select: { name: true } } };
}>;

@Injectable()
export class AdminAgendaBlockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async listAgendaBlocks(user: JwtPayload, businessId: string, fromIso?: string, toIso?: string) {
    await this.assertBusinessAccess(user, businessId);
    const where: Prisma.AgendaBlockWhereInput = { businessId };
    if (fromIso && toIso) {
      const from = new Date(fromIso);
      const to = new Date(toIso);
      if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
        where.AND = [{ endsAt: { gt: from } }, { startsAt: { lt: to } }];
      }
    }
    return this.prisma.agendaBlock.findMany({
      where,
      orderBy: { startsAt: 'asc' },
      take: 250,
    });
  }

  async deleteAgendaBlock(user: JwtPayload, blockId: string) {
    const row = await this.prisma.agendaBlock.findFirst({ where: { id: blockId } });
    if (!row) throw new NotFoundException('Bloqueo no encontrado');
    await this.assertBusinessAccess(user, row.businessId);
    await this.prisma.agendaBlock.delete({ where: { id: blockId } });
    return { ok: true };
  }

  async createAgendaBlock(user: JwtPayload, businessId: string, dto: CreateAgendaBlockAdminDto) {
    await this.assertBusinessAccess(user, businessId);
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw new BadRequestException('Fechas inválidas');
    }
    if (startsAt >= endsAt) throw new BadRequestException('La hora de fin debe ser posterior al inicio');

    const reason = dto.reason.trim();
    const conflicts = await this.findBookingsOverlappingInterval(businessId, startsAt, endsAt);

    if (dto.dryRun === true) {
      return { dryRun: true as const, conflicts: this.serializeConflicts(conflicts) };
    }

    const onConflict = dto.onConflict ?? 'fail';

    if (conflicts.length > 0 && onConflict === 'fail') {
      throw new ConflictException({
        message: 'Hay turnos que se superponen con este bloqueo.',
        conflicts: this.serializeConflicts(conflicts),
      });
    }

    const biz = await this.prisma.business.findFirst({
      where: { id: businessId },
      select: { name: true, timezone: true },
    });
    const bizName = biz?.name ?? 'El negocio';
    const tz = (biz?.timezone ?? 'America/Argentina/Buenos_Aires').trim() || 'America/Argentina/Buenos_Aires';
    const whenLine = this.formatBlockRangeLine(startsAt, endsAt, tz);

    if (conflicts.length > 0 && (onConflict === 'cancel_silent' || onConflict === 'cancel_with_notice')) {
      const block = await this.prisma.$transaction(async (tx) => {
        for (const b of conflicts) {
          await tx.booking.update({
            where: { id: b.id },
            data: { status: BookingStatus.cancelled },
          });
        }
        return tx.agendaBlock.create({
          data: { businessId, startsAt, endsAt, reason },
        });
      });

      const notices: { bookingId: string; emailSent: boolean; whatsappUrl: string | null }[] = [];

      if (onConflict === 'cancel_with_notice') {
        for (const b of conflicts) {
          const contact = (b.customerContact ?? '').trim();
          let emailSent = false;
          let whatsappUrl: string | null = null;
          if (this.looksLikeEmail(contact)) {
            try {
              await this.mail.sendBookingCancelledAgendaBlock({
                to: contact,
                businessName: bizName,
                customerName: b.customerFullName,
                serviceName: b.service.name,
                bookingCode: b.code,
                blockReason: reason,
                whenLine,
              });
              emailSent = true;
            } catch {
              /* ignore */
            }
          } else {
            whatsappUrl = this.buildWhatsappCancellationUrl(contact, bizName, b, reason, whenLine);
          }
          notices.push({ bookingId: b.id, emailSent, whatsappUrl });
        }
      }

      return {
        dryRun: false as const,
        block,
        cancelledBookingIds: conflicts.map((c) => c.id),
        notices,
      };
    }

    const block = await this.prisma.agendaBlock.create({
      data: { businessId, startsAt, endsAt, reason },
    });
    return {
      dryRun: false as const,
      block,
      cancelledBookingIds: [] as string[],
      notices: [] as { bookingId: string; emailSent: boolean; whatsappUrl: string | null }[],
    };
  }

  private formatBlockRangeLine(startsAt: Date, endsAt: Date, timeZone: string): string {
    const z = timeZone?.trim() || 'America/Argentina/Buenos_Aires';
    const a = DateTime.fromJSDate(startsAt).setZone(z).toFormat('dd/MM/yyyy HH:mm');
    const b = DateTime.fromJSDate(endsAt).setZone(z).toFormat('dd/MM/yyyy HH:mm');
    return `${a} – ${b}`;
  }

  private looksLikeEmail(s: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  }

  private buildWhatsappCancellationUrl(
    contact: string,
    businessName: string,
    b: BookingWithServiceName,
    blockReason: string,
    whenLine: string,
  ): string | null {
    const digits = contact.replace(/\D/g, '');
    if (digits.length < 8) return null;
    let n = digits;
    if (!n.startsWith('54') && n.length <= 11) n = `54${n}`;
    const msg = `Hola, te escribimos desde ${businessName}: tu turno de ${b.service.name} (código ${b.code}) se canceló porque bloqueamos la agenda (${whenLine}). Motivo: ${blockReason}. Cualquier duda respondé a este mensaje.`;
    return `https://wa.me/${n}?text=${encodeURIComponent(msg)}`;
  }

  private serializeConflicts(rows: BookingWithServiceName[]) {
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      startsAt: r.startsAt.toISOString(),
      durationMin: r.durationMin,
      status: r.status,
      customerFullName: r.customerFullName,
      customerContact: r.customerContact,
      service: { name: r.service.name },
    }));
  }

  private async findBookingsOverlappingInterval(
    businessId: string,
    rangeStart: Date,
    rangeEnd: Date,
  ): Promise<BookingWithServiceName[]> {
    const lowerBound = new Date(rangeStart.getTime() - 24 * 60 * 60 * 1000);
    const candidates = await this.prisma.booking.findMany({
      where: {
        businessId,
        status: { not: BookingStatus.cancelled },
        startsAt: { lt: rangeEnd, gte: lowerBound },
      },
      include: { service: { select: { name: true } } },
      take: 400,
    });
    const rs = rangeStart.getTime();
    const re = rangeEnd.getTime();
    return candidates.filter((b) => {
      const bs = b.startsAt.getTime();
      const be = bs + b.durationMin * 60_000;
      return bs < re && be > rs;
    });
  }

  private async assertBusinessAccess(user: JwtPayload, businessId: string): Promise<void> {
    const ids = await this.accessibleBusinessIds(user);
    if (!ids.includes(businessId)) throw new ForbiddenException('Sin acceso a este negocio');
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
}
