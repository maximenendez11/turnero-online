import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { BookingContactService } from './booking-contact.service';
import { SendBookingEmailCodeDto } from './dto/send-booking-email-code.dto';
import { VerifyBookingEmailCodeDto } from './dto/verify-booking-email-code.dto';
import { VerifyGoogleBookingContactDto } from './dto/verify-google-booking-contact.dto';

@Controller('public/businesses/:slug/booking-contact')
@UseGuards(ThrottlerGuard)
export class PublicBookingContactController {
  constructor(private readonly bookingContact: BookingContactService) {}

  @Post('email/send-code')
  @Throttle({ default: { limit: 5, ttl: 600_000 } })
  sendEmailCode(@Param('slug') slug: string, @Body() dto: SendBookingEmailCodeDto) {
    return this.bookingContact.sendEmailCode(slug, dto.email);
  }

  @Post('email/verify-code')
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  verifyEmailCode(@Param('slug') slug: string, @Body() dto: VerifyBookingEmailCodeDto) {
    return this.bookingContact.verifyEmailCode(slug, dto.email, dto.code);
  }

  @Post('google')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  verifyGoogle(@Param('slug') slug: string, @Body() dto: VerifyGoogleBookingContactDto) {
    return this.bookingContact.verifyGoogle(slug, dto.idToken);
  }
}
