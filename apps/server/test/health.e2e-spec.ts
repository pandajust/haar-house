import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';

/**
 * 验收 T3：NestJS 后端骨架
 *
 * 覆盖 AC：
 *  - AC2: 应用能启动（隐式：测试本身能跑通即证明模块可初始化）
 *  - AC3: GET /health 返回 {status:'ok', timestamp}
 *  - AC4: swagger UI 可访问（GET /api/docs-json 返回 spec）
 *  - AC5: ZodValidationPipe 拒绝未知字段（forbidNonWhitelisted 等价）
 *  - AC6: HttpExceptionFilter 统一错误格式 {code, message, details}
 *  - AC7: TransformInterceptor 统一响应格式 {code, data, message}
 *
 * 说明：全局管道/过滤器/拦截器 通过 AppModule 的 APP_PIPE / APP_FILTER /
 *      APP_INTERCEPTOR 自动注册，这里不重复 useGlobalPipes 等，避免双重包装。
 */
describe('App (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    const config = app.get(ConfigService);
    const apiPrefix = config.get<string>('API_PREFIX') ?? 'api';
    const swaggerPrefix = config.get<string>('SWAGGER_PREFIX') ?? 'api/docs';

    app.setGlobalPrefix(apiPrefix, { exclude: ['health'] });

    const swaggerConfig = new DocumentBuilder()
      .setTitle('理发店管理系统 API')
      .setVersion('0.1.0')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(swaggerPrefix, app, document);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('AC3 + AC7: GET /health → 200，统一响应包 {code, data, message}，data 含 status=ok 与 ISO 时间戳', async () => {
    const res = await request(app.getHttpServer()).get('/health');

    expect(res.status).toBe(200);
    // AC7: TransformInterceptor 统一响应格式
    expect(res.body).toEqual(
      expect.objectContaining({
        code: 200,
        message: 'success',
      }),
    );
    // AC3: data 形如 {status:'ok', timestamp: ISO}
    expect(res.body.data).toEqual(
      expect.objectContaining({
        status: 'ok',
      }),
    );
    expect(typeof res.body.data.timestamp).toBe('string');
    expect(() => new Date(res.body.data.timestamp).toISOString()).not.toThrow();
  });

  it('AC5 + AC7: POST /api/echo（合法体）→ 200，data 原样回显', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/echo')
      .send({ message: 'hello', echo: true });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data).toEqual({ message: 'hello', echo: true });
  });

  it('AC5 + AC6: POST /api/echo（未知字段）→ 400，zod strict 拒绝未知字段', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/echo')
      .send({ message: 'hello', unknownField: 'should-be-rejected' });

    expect(res.status).toBe(400);
    // AC6: HttpExceptionFilter 统一错误格式 {code, message, details}
    expect(res.body).toEqual(
      expect.objectContaining({
        code: 400,
        message: expect.any(String),
      }),
    );
    expect(res.body.details).toBeDefined();
    // strict 模式应指出 unknownField 是未知字段
    const details = JSON.stringify(res.body.details);
    expect(details).toContain('unknownField');
  });

  it('AC5 + AC6: POST /api/echo（缺必填字段）→ 400，details 指出缺失字段', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/echo')
      .send({ echo: true });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
    expect(res.body.details).toBeDefined();
    expect(JSON.stringify(res.body.details)).toContain('message');
  });

  it('AC6: GET /api/this-route-does-not-exist → 404，错误格式 {code, message, details}', async () => {
    const res = await request(app.getHttpServer()).get('/api/this-route-does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.code).toBe(404);
    expect(res.body.message).toEqual(expect.any(String));
    expect(res.body.timestamp).toBeDefined();
  });

  it('AC4: GET /api/docs-json → 200，swagger spec 可访问', async () => {
    const res = await request(app.getHttpServer()).get('/api/docs-json');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        openapi: expect.any(String),
        info: expect.objectContaining({ title: '理发店管理系统 API' }),
        paths: expect.any(Object),
      }),
    );
    // /health 路径应出现在 spec 中
    expect(res.body.paths['/health']).toBeDefined();
  });
});
