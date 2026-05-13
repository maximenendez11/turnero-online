import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class VerifyBookingEmailCodeDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @MinLength(4)
  @MaxLength(12)
  code!: string;
}
