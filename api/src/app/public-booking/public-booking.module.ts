import { Module } from '@nestjs/common';
import { PublicBookingController } from './public-booking.controller';
import { PublicBookingContactController } from './public-booking-contact.controller';
import { PublicBookingService } from './public-booking.service';
import { BookingContactService } from './booking-contact.service';
import { BookingContactTokenService } from './booking-contact-token.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [PublicBookingController, PublicBookingContactController],
  providers: [PublicBookingService, BookingContactService, BookingContactTokenService],
})
export class PublicBookingModule {}
