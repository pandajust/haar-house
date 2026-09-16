import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor, TransformInterceptor } from './common/interceptors';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe';
import { loadDerivedConfig } from './config/configuration';
import { validateEnv } from './config/env.validation';

/**
 * 根模块。
 *
 * 全局注册：
 *  - ConfigModule：@nestjs/config + zod 校验
 *  - APP_PIPE: ZodValidationPipe（路由级用 strictObject 拒绝未知字段，
 *              等价 whitelist+forbidNonWhitelisted）
 *  - APP_FILTER: HttpExceptionFilter（统一错误格式 {code, message, details}）
 *  - APP_INTERCEPTOR: LoggingInterceptor + TransformInterceptor
 *    （统一响应格式 {code, data, message}）
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      // 用 zod 替代 joi 做环境变量校验，失败即 fail-fast
      validate: (env) => validateEnv(env as Record<string, unknown>),
      load: [loadDerivedConfig],
    }),
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
