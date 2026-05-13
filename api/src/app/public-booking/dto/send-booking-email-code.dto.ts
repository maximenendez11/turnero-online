import { IsEmail, MaxLength } from 'class-validator';

export class SendBookingEmailCodeDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;
}
