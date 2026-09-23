import { Module } from '@nestjs/common';

import { ClientController } from './client.controller';
import { ClientService } from './client.service';

/**
 * 客户档案模块。
 *
 * 提供客户 CRUD 接口。PrismaService 由 @Global PrismaModule 提供，
 * 无需在此 imports 中声明。
 */
@Module({
  controllers: [ClientController],
  providers: [ClientService],
  exports: [ClientService],
})
export class ClientModule {}