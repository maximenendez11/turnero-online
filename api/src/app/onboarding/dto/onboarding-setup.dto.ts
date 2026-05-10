import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class OnboardingSetupDto {
  @IsString()
  @MinLength(1)
  businessName!: string;

  @IsOptional()
  @IsString()
  businessCategory?: string;

  @IsOptional()
  @IsString()
  businessDescription?: string;

  @IsString()
  @MinLength(1)
  address!: string;

  @IsString()
  timezone!: string;

  @IsString()
  currency!: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;

  @IsOptional()
  @IsString()
  instagram?: string;

  @IsString()
  @MinLength(1)
  serviceName!: string;

  @IsString()
  openingHours!: string;

  @Type(() => Number)
  @IsInt()
  @Min(5)
  serviceDurationMin!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  servicePrice!: number;

  @Type(() => Number)
  @IsInt()
  @Min(5)
  bookingIntervalMin!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxAppointmentsPerSlot!: number;

  @Type(() => Boolean)
  @IsBoolean()
  requiresDeposit!: boolean;

  @IsIn(['none', 'fixed', 'percent'])
  depositMode!: 'none' | 'fixed' | 'percent';

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  depositValue!: number;
}
