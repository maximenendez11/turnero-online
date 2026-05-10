import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OnboardingSetupDto } from './dto/onboarding-setup.dto';
import { OnboardingService } from './onboarding.service';

@Controller('onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Post('setup')
  setup(@Body() dto: OnboardingSetupDto) {
    return this.onboarding.setup(dto);
  }
}
