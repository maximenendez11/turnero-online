import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CreatePublicBookingDto } from './dto/create-public-booking.dto';
import { PublicBookingService } from './public-booking.service';

@Controller('public')
export class PublicBookingController {
  constructor(private readonly service: PublicBookingService) {}

  @Get('businesses')
  searchBusinesses(@Query('query') query?: string) {
    return this.service.searchBusinesses(query);
  }

  @Get('businesses/:slug')
  getBusiness(@Param('slug') slug: string) {
    return this.service.getBusinessBySlug(slug);
  }

  @Get('businesses/:slug/services')
  getServices(@Param('slug') slug: string) {
    return this.service.getServices(slug);
  }

  @Get('businesses/:slug/staff')
  getStaff(@Param('slug') slug: string, @Query('serviceId') serviceId?: string) {
    return this.service.getStaff(slug, serviceId);
  }

  @Get('businesses/:slug/availability')
  getAvailability(
    @Param('slug') slug: string,
    @Query('serviceId') serviceId: string,
    @Query('staffId') staffId: string,
    @Query('date') date: string,
  ) {
    return this.service.getAvailability(slug, serviceId, staffId, date);
  }

  @Post('businesses/:slug/bookings')
  createBooking(@Param('slug') slug: string, @Body() dto: CreatePublicBookingDto) {
    return this.service.createBooking(slug, dto);
  }

  @Get('businesses/:slug/bookings/:code')
  getBooking(@Param('slug') slug: string, @Param('code') code: string) {
    return this.service.getBooking(slug, code);
  }
}
