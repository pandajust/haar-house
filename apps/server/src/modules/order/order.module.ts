import { Module } from '@nestjs/common';

import { OrderController } from './order.controller';
import { OrderService } from './order.service';

/**
 * 订单模块：开单收银、查询、退款。
 *
 * PrismaService 由全局 PrismaModule 提供，无需在此 imports。
 * 会员卡相关表（member_card / card_transaction）由 OrderService 通过
 * Prisma 直接操作（M1 跨模块查表简化）。
 */
@Module({
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}