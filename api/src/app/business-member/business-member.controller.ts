import { Body, Controller, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentTenant } from '../tenancy/current-tenant.decorator';
import type { TenantContext } from '../tenancy/tenant-context.types';
import { TenantGuard } from '../tenancy/tenant.guard';
import { BusinessMemberService } from './business-member.service';
import { CreateBusinessMemberDto } from './dto/create-business-member.dto';
import { UpdateBusinessMemberDto } from './dto/update-business-member.dto';

@Controller('business-members')
@UseGuards(TenantGuard)
export class BusinessMemberController {
  constructor(private readonly businessMemberService: BusinessMemberService) {}

  @Post()
  create(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateBusinessMemberDto) {
    return this.businessMemberService.create({ ...dto, businessId: tenant.businessId });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBusinessMemberDto) {
    return this.businessMemberService.update(id, dto);
  }
}
