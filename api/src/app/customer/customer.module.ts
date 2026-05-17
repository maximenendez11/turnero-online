import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CustomerBookingsController } from './customer-bookings.controller';
import { CustomerBookingsService } from './customer-bookings.service';

@Module({
  imports: [PrismaModule],
  controllers: [CustomerBookingsController],
  providers: [CustomerBookingsService],
})
export class CustomerModule {}
