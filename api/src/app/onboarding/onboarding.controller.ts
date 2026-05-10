import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt-payload.types';
import { OnboardingSetupDto } from './dto/onboarding-setup.dto';
import { OnboardingService } from './onboarding.service';

@Controller('onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Post('setup')
  setup(@CurrentUser() user: JwtPayload, @Body() dto: OnboardingSetupDto) {
    return this.onboarding.setup(dto, user.sub);
  }
}
