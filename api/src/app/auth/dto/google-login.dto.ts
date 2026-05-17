import { IsString, MinLength } from 'class-validator';

export class GoogleLoginDto {
  /** JWT `credential` de Google Identity Services. */
  @IsString()
  @MinLength(10)
  idToken!: string;
}
