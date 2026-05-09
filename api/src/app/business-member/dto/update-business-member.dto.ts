import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TenantRole } from '../../auth/tenant-role.enum';

export class UpdateBusinessMemberDto {
  @IsOptional()
  @IsEnum(TenantRole)
  role?: TenantRole;

  @IsOptional()
  @IsString()
  status?: string;
}
