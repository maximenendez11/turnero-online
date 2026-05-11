import { Body, Controller, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.types';
import { AdminService } from './admin.service';
import { PatchBusinessAdminDto } from './dto/patch-business-admin.dto';
import { ReplaceOpeningWindowsDto } from './dto/replace-opening-windows.dto';
import { CreateServiceAdminDto, PatchServiceAdminDto } from './dto/patch-service-admin.dto';
import { PatchBookingAdminDto } from './dto/patch-booking-admin.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('dashboard/metrics')
  dashboardMetrics(@CurrentUser() user: JwtPayload) {
    return this.admin.getDashboardMetrics(user);
  }

  @Get('businesses')
  listBusinesses(@CurrentUser() user: JwtPayload) {
    return this.admin.listBusinesses(user);
  }

  @Get('businesses/:id')
  getBusiness(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.admin.getBusinessDetail(user, id);
  }

  @Patch('businesses/:id')
  patchBusiness(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: PatchBusinessAdminDto) {
    return this.admin.patchBusiness(user, id, dto);
  }

  @Put('businesses/:id/opening-windows')
  replaceWindows(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ReplaceOpeningWindowsDto,
  ) {
    return this.admin.replaceOpeningWindows(user, id, dto);
  }

  @Post('businesses/:id/services')
  createService(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: CreateServiceAdminDto) {
    return this.admin.createService(user, id, dto);
  }

  @Patch('services/:serviceId')
  patchService(@CurrentUser() user: JwtPayload, @Param('serviceId') serviceId: string, @Body() dto: PatchServiceAdminDto) {
    return this.admin.patchService(user, serviceId, dto);
  }

  @Get('bookings')
  listBookings(@CurrentUser() user: JwtPayload, @Query('businessId') businessId?: string) {
    return this.admin.listBookings(user, businessId);
  }

  @Patch('bookings/:bookingId')
  patchBooking(@CurrentUser() user: JwtPayload, @Param('bookingId') bookingId: string, @Body() dto: PatchBookingAdminDto) {
    return this.admin.patchBooking(user, bookingId, dto);
  }
}
