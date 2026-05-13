import { IsString, MinLength } from 'class-validator';

export class VerifyGoogleBookingContactDto {
  /** JWT `credential` de Google Identity Services o `id_token` crudo. */
  @IsString()
  @MinLength(10)
  idToken!: string;
}
