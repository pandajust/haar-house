import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';

/**
 * Bootstrap。
 *
 * 全局管道 / 过滤器 / 拦截器 通过 AppModule 的 APP_PIPE / APP_FILTER / APP_INTERCEPTOR
 * 注册（DI 方式），这里不再重复 useGlobalPipes 等调用，避免双重包装。
 * 此处只做：全局前缀、CORS、Swagger、监听端口。
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = new Logger('Bootstrap');

  const config = app.get(ConfigService);
  const port = Number(config.get<string>('PORT') ?? 3000);
  const apiPrefix = config.get<string>('API_PREFIX') ?? 'api';
  const swaggerPrefix = config.get<string>('SWAGGER_PREFIX') ?? 'api/docs';
  const corsOriginsRaw = config.get<string>('CORS_ORIGINS') ?? '';
  const corsOrigins = corsOriginsRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // 全局前缀：除 health 外，所有路由挂 /api
  app.setGlobalPrefix(apiPrefix, { exclude: ['health'] });

  app.enableCors({
    origin: corsOrigins.length ? corsOrigins : true,
    credentials: true,
  });

  // Swagger UI（SwaggerModule.setup 注册的路径不受 setGlobalPrefix 影响）
  const swaggerConfig = new DocumentBuilder()
    .setTitle('理发店管理系统 API')
    .setDescription('模块化单体后端 API 文档（M1 阶段）')
    .setVersion('0.1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', name: 'Authorization' },
      'access-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(swaggerPrefix, app, document);

  await app.listen(port);

  logger.log(`🚀 Server listening on http://localhost:${port}`);
  logger.log(`📌 API base:      http://localhost:${port}/${apiPrefix}`);
  logger.log(`💚 Health check:  http://localhost:${port}/health`);
  logger.log(`📚 Swagger UI:   http://localhost:${port}/${swaggerPrefix}`);
}

void bootstrap().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
