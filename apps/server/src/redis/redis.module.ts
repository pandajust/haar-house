import { Global, Module } from '@nestjs/common';

import { RedisService } from './redis.service';

/**
 * 全局 Redis 模块。
 *
 * - @Global 让任意模块无需 import 即可注入 RedisService
 * - 单例连接，避免多实例导致连接数膨胀
 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
