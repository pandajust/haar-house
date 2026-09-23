import { Module } from '@nestjs/common';

import { MemberCardController } from './member-card.controller';
import { MemberCardService } from './member-card.service';

/**
 * 会员卡模块：发卡、充值、查询、流水。
 *
 * PrismaService 由全局 PrismaModule 提供，无需在此 imports。
 */
@Module({
  controllers: [MemberCardController],
  providers: [MemberCardService],
  exports: [MemberCardService],
})
export class MemberCardModule {}