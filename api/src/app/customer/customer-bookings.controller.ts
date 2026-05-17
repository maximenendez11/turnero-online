import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.types';
import { CustomerBookingsService } from './customer-bookings.service';

@Controller('customer')
@UseGuards(JwtAuthGuard)
export class CustomerBookingsController {
  constructor(private readonly bookings: CustomerBookingsService) {}

  @Get('bookings')
  listMyBookings(@CurrentUser() user: JwtPayload) {
    return this.bookings.listForUser(user);
  }
}
