import { IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePublicBookingDto {
  @IsUUID()
  serviceId!: string;

  @IsUUID()
  staffId!: string;

  @IsString()
  startsAt!: string;

  @IsString()
  customerName!: string;

  @IsEmail()
  customerEmail!: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
