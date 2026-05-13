import { IsString, IsUUID, MinLength } from 'class-validator';

export class CreatePublicBookingDto {
  @IsUUID()
  serviceId!: string;

  @IsString()
  startsAt!: string;

  @IsString()
  @MinLength(2)
  customerFullName!: string;

  /** JWT emitido tras verificar email (OTP) o Google para este negocio. */
  @IsString()
  @MinLength(20)
  bookingContactToken!: string;
}
