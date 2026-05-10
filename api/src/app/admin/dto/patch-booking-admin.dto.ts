import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';
import { BookingStatus } from '@prisma/client';

export class PatchBookingAdminDto {
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  customerFullName?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  customerContact?: string;

  @IsOptional()
  @IsString()
  startsAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  durationMin?: number;

  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}
