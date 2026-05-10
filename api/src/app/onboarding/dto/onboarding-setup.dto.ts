import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

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
  @MinLength(1)
  serviceName!: string;

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
}
