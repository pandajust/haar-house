import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Redis 服务（ioredis 单例封装）。
 *
 * 用途：
 *  - AppointmentModule 的预约分布式锁（SET NX + 过期）
 *  - 后续可扩展缓存、会话等
 *
 * 设计：
 *  - 启动期 connect 失败仅 warn 不抛错（与 PrismaService 一致）
 *  - 监听 error 事件，避免 ioredis 未处理错误事件刷屏
 *  - retryStrategy 限制重连频率，无 Redis 时快速失败
 *  - 提供 lock(key, ttlMs) / unlock(key, token) 分布式锁辅助
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  public readonly client: Redis;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('REDIS_URL') ?? 'redis://localhost:6379/0';
    this.client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      retryStrategy(times: number) {
        // 最多重试 3 次，每次间隔翻倍；之后不再自动重连
        if (times > 3) return null;
        return Math.min(1000 * Math.pow(2, times), 5000);
      },
    });
    // 吞掉连接错误，避免 unhandled error 刷屏；查询时仍会返回错误
    this.client.on('error', (err: Error) => {
      if (err.message.includes('ECONNREFUSED') || err.message.includes('connect')) {
        // 仅首次 warn，后续静默（Redis 未启动时常见）
        this.logger.debug(`Redis connection error: ${err.message}`);
      } else {
        this.logger.warn(`Redis error: ${err.message}`);
      }
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.connect();
      this.logger.log('✅ Redis connected');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`⚠️ Redis connect failed (will retry on query): ${msg}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client.quit();
      this.logger.log('👋 Redis disconnected');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Redis disconnect error: ${msg}`);
    }
  }

  /**
   * 分布式锁：SET key value NX PX ttlMs
   */
  async lock(key: string, ttlMs: number): Promise<{ ok: boolean; token: string }> {
    const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const res = await this.client.set(key, token, 'PX', ttlMs, 'NX');
    return { ok: res === 'OK', token };
  }

  /**
   * 解锁：仅当 value 匹配 token 时才删除（Lua 脚本保证原子性）。
   */
  async unlock(key: string, token: string): Promise<void> {
    const script = `if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end`;
    await this.client.eval(script, 1, key, token);
  }
}