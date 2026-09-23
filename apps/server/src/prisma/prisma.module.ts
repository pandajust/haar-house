import { Global, Module } from '@nestjs/common';

import { PrismaService } from './prisma.service';

/**
 * 全局 PrismaModule。
 *
 * - @Global 让任意模块无需再 import 即可注入 PrismaService
 * - 单例: 整个应用共享一个 PrismaClient（连接池），避免多实例导致连接数膨胀
 *
 * 使用: 仅在 AppModule 的 imports 中追加 PrismaModule 即可，
 *      业务模块直接 `constructor(private readonly prisma: PrismaService)` 注入。
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
