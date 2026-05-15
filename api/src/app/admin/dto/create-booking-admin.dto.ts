import { IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { BookingStatus } from '@prisma/client';

export class CreateBookingAdminDto {
  @IsUUID()
  serviceId!: string;

  @IsString()
  startsAt!: string;

  @IsString()
  @MinLength(2)
  customerFullName!: string;

  /** Opcional: teléfono u otro dato (p. ej. walk-in sin contacto). */
  @IsOptional()
  @IsString()
  customerContact?: string;

  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}
