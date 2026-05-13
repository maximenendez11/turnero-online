import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export const SERVICE_SCHEDULING_TYPES = ['regular', 'variable_date', 'cupos'] as const;

export class CreateServiceAdminDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsInt()
  @Min(5)
  durationMin!: number;

  @IsOptional()
  @IsBoolean()
  priceOnRequest?: boolean;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  depositPercent?: number | null;

  @IsOptional()
  @IsBoolean()
  modalityPresencial?: boolean;

  @IsOptional()
  @IsBoolean()
  modalityOnline?: boolean;

  @IsOptional()
  @IsBoolean()
  modalityDomicilio?: boolean;

  @IsOptional()
  @IsIn(SERVICE_SCHEDULING_TYPES)
  schedulingType?: (typeof SERVICE_SCHEDULING_TYPES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(12000)
  reminderClarifications?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  imageUrl2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  imageUrl3?: string;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  staffIds?: string[];
}

export class PatchServiceAdminDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  durationMin?: number;

  @IsOptional()
  @IsBoolean()
  priceOnRequest?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  depositPercent?: number | null;

  @IsOptional()
  @IsBoolean()
  modalityPresencial?: boolean;

  @IsOptional()
  @IsBoolean()
  modalityOnline?: boolean;

  @IsOptional()
  @IsBoolean()
  modalityDomicilio?: boolean;

  @IsOptional()
  @IsIn(SERVICE_SCHEDULING_TYPES)
  schedulingType?: (typeof SERVICE_SCHEDULING_TYPES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(12000)
  reminderClarifications?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  imageUrl2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  imageUrl3?: string;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  staffIds?: string[];
}
