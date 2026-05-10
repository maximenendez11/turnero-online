import { IsString, IsUUID, MinLength } from 'class-validator';

export class CreatePublicBookingDto {
  @IsUUID()
  serviceId!: string;

  @IsString()
  startsAt!: string;

  @IsString()
  @MinLength(2)
  customerFullName!: string;

  @IsString()
  @MinLength(3)
  customerContact!: string;
}
