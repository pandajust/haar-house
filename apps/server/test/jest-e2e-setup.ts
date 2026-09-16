/**
 * E2E 测试启动前注入测试用环境变量。
 *
 * 因为 AppModule 通过 @nestjs/config + zod 校验环境变量（DATABASE_URL/JWT_SECRET 必填），
 * 测试环境下没有 .env 文件，需在此处用 mock 值填充 process.env。
 * 此文件通过 jest 的 setupFilesAfterEnv 在每个测试套件前加载。
 */

process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.PORT = process.env.PORT ?? '3000';
process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? 'debug';
process.env.CORS_ORIGINS = process.env.CORS_ORIGINS ?? '';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://hair:hair_pass@localhost:5432/hair_test';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379/0';
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? 'test-jwt-secret-at-least-32-chars-long-string';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '2h';
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';
process.env.WX_APPID = process.env.WX_APPID ?? 'test-appid';
process.env.WX_SECRET = process.env.WX_SECRET ?? 'test-secret';
process.env.API_PREFIX = process.env.API_PREFIX ?? 'api';
process.env.SWAGGER_PREFIX = process.env.SWAGGER_PREFIX ?? 'api/docs';
