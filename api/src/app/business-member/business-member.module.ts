import { Module } from '@nestjs/common';
import { BusinessMemberController } from './business-member.controller';
import { BusinessMemberService } from './business-member.service';

@Module({
  controllers: [BusinessMemberController],
  providers: [BusinessMemberService],
})
export class BusinessMemberModule {}
