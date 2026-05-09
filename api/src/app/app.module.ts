import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import configuration from './config/configuration';
import { TenancyModule } from './tenancy/tenancy.module';
import { AuthModule } from './auth/auth.module';
import { BusinessMemberModule } from './business-member/business-member.module';
import { PublicBookingModule } from './public-booking/public-booking.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['../.env', '.env'],
    }),
    PrismaModule,
    HealthModule,
    TenancyModule,
    AuthModule,
    BusinessMemberModule,
    PublicBookingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
