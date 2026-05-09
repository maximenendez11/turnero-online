import { IsEnum, IsString, IsUUID } from 'class-validator';
import { TenantRole } from '../../auth/tenant-role.enum';

export class CreateBusinessMemberDto {
  @IsUUID()
  userId!: string;

  @IsUUID()
  businessId!: string;

  @IsEnum(TenantRole)
  role!: TenantRole;

  @IsString()
  status!: string;
}
