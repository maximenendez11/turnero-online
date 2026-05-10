import { IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { BusinessStatus } from '@prisma/client';

export class PatchBusinessAdminDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  address?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  timezone?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  bookingIntervalMin?: number;

  @IsOptional()
  @IsEnum(BusinessStatus)
  status?: BusinessStatus;
}
