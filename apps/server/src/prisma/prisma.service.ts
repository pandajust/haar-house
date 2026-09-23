import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaClient 包装。
 *
 * 设计要点:
 *  - onModuleInit 中显式 $connect，启动期暴露 DB 不可达问题（fail-fast）
 *  - 失败仅打印 warn 而不抛错，避免测试环境无 DB 时整应用启动崩溃
 *    （生产环境下查询会再次失败并抛出，符合"DB 必须可达"语义）
 *  - onModuleDestroy 中 $disconnect，释放连接池
 *  - 启用 Prisma query 日志（仅在非生产环境输出 SQL，便于调试）
 *
 * 使用方式: 在任意 provider 中通过 `inject PrismaService` 获取单例，
 *           直接调用 prismaService.shop.findMany() 等方法（PrismaClient 方法透传）。
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // 非生产环境打印 query SQL，便于排查慢查询与调试
    const logLevel = process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query', 'error', 'warn'];
    super({
      log: logLevel as never,
      errorFormat: 'colorless',
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('✅ PrismaClient connected');
    } catch (err: unknown) {
      // 测试/无 DB 环境下不阻塞应用启动；查询时仍会再次失败
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`⚠️ PrismaClient connect failed (will retry on query): ${msg}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.$disconnect();
      this.logger.log('👋 PrismaClient disconnected');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Prisma disconnect error: ${msg}`);
    }
  }
}
