import { Module } from '@nestjs/common';

import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';

/**
 * 店铺模块：店铺信息与服务目录 CRUD。
 *
 * PrismaService 由全局 PrismaModule 提供，无需在此 import。
 */
@Module({
  controllers: [ShopController],
  providers: [ShopService],
})
export class ShopModule {}