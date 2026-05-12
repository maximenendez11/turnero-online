import { IsEnum, IsInt, IsOptional, IsString, Matches, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
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

  /** Vacío borra el valor (tema por defecto en el cliente). */
  @IsOptional()
  @ValidateIf((_, v) => v !== undefined && String(v).trim() !== '')
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'themeBackgroundHex debe ser #RRGGBB' })
  themeBackgroundHex?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== undefined && String(v).trim() !== '')
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'themePrimaryHex debe ser #RRGGBB' })
  themePrimaryHex?: string;

  /** URL de imagen de cabecera en la landing pública; vacío borra (usa imagen por defecto en el cliente). */
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  bannerImageUrl?: string;
}
