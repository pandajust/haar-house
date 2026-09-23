import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';

/**
 * 验收 T8：AuthModule（账密登录 + 微信小程序登录 + JWT + RBAC）。
 *
 * 覆盖 AC：
 *  - AC3: POST /api/auth/login {admin, admin123} → 200 + token
 *  - AC4: GET /api/auth/me 不带 token → 401
 *  - AC5: GET /api/auth/me 带合法 token → 200 + 当前用户
 *  - AC6: POST /api/auth/wx-login {code:'mock-code'} → 200 + token（mock 模式）
 *  - AC7: POST /api/auth/refresh {refresh_token} → 200 + 新 token
 *  - AC8: @Roles('owner') 守卫：非 owner 角色（client）访问 → 403
 *  - AC9: swagger 中标注 BearerAuth（spec securitySchemes 含 access-token）
 *
 * 测试环境说明：
 *  - jest-e2e-setup.ts 已注入 JWT_SECRET / WX_APPID 等环境变量
 *  - WX_APPID 默认为 'test-appid'（非占位串），AuthService 会真实调用微信 API；
 *    由于测试环境无外网/被微信拒绝，会降级为 mock openid（NODE_ENV='test'）
 */
describe('Auth (e2e)', () => {
  let app: INestApplication;
  let adminTokens: {
    access_token: string;
    refresh_token: string;
    user: { id: string; username: string; role: string; kind: string };
  };
  let clientTokens: { access_token: string; refresh_token: string };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    const config = app.get(ConfigService);
    const apiPrefix = config.get<string>('API_PREFIX') ?? 'api';
    const swaggerPrefix = config.get<string>('SWAGGER_PREFIX') ?? 'api/docs';

    app.setGlobalPrefix(apiPrefix, { exclude: ['health'] });

    // 与 main.ts 保持一致：addBearerAuth(name='access-token')，验证 AC9
    const swaggerConfig = new DocumentBuilder()
      .setTitle('理发店管理系统 API')
      .setDescription('鉴权模块 e2e 测试')
      .setVersion('0.1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', name: 'Authorization' },
        'access-token',
      )
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(swaggerPrefix, app, document);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // AC3: 账密登录成功
  it('AC3: POST /api/auth/login {admin, admin123} → 200，返回 access/refresh token 与 user', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.message).toBe('success');

    const data = res.body.data;
    expect(data).toEqual(
      expect.objectContaining({
        access_token: expect.any(String),
        refresh_token: expect.any(String),
      }),
    );
    expect(data.user).toEqual(
      expect.objectContaining({
        id: 'mock-staff-id',
        username: 'admin',
        role: 'owner',
        kind: 'staff',
      }),
    );

    adminTokens = data;
  });

  // 账密登录失败：错误密码 → 401
  it('账密登录错误密码 → 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe(401);
    expect(res.body.message).toEqual(expect.any(String));
  });

  // 账密登录失败：未知字段被 strictObject 拒绝 → 400
  it('账密登录带未知字段 → 400（zod strict）', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123', extra: 'x' });

    expect(res.status).toBe(400);
  });

  // AC4: 不带 token 访问 /auth/me → 401
  it('AC4: GET /api/auth/me 不带 token → 401', async () => {
    const res = await request(app.getHttpServer()).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.code).toBe(401);
  });

  // AC5: 带合法 token 访问 /auth/me → 200 + 当前用户
  it('AC5: GET /api/auth/me 带合法 token → 200 + 当前用户', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminTokens.access_token}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data).toEqual(
      expect.objectContaining({
        id: 'mock-staff-id',
        username: 'admin',
        role: 'owner',
        kind: 'staff',
      }),
    );
  });

  // 携带 refresh token 通过 Authorization 头访问 /auth/me 应被拒（防滥用）
  it('GET /api/auth/me 用 refresh token 当 access → 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminTokens.refresh_token}`);

    expect(res.status).toBe(401);
  });

  // AC6: 微信小程序登录（mock 模式）
  it('AC6: POST /api/auth/wx-login {code:"mock-code"} → 200 + token（mock openid 降级）', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/wx-login')
      .send({ code: 'mock-code' });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    const data = res.body.data;
    expect(data.access_token).toEqual(expect.any(String));
    expect(data.refresh_token).toEqual(expect.any(String));
    expect(data.user.kind).toBe('client');
    // mock-code 命中 stub 的 mock-openid，user.id 应是 mock-client-id
    expect(data.user.id).toBe('mock-client-id');
    expect(data.user.openid).toBe('mock-openid');

    clientTokens = { access_token: data.access_token, refresh_token: data.refresh_token };
  });

  // AC7: 刷新 token
  it('AC7: POST /api/auth/refresh {refresh_token} → 200 + 新的一对 token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refresh_token: adminTokens.refresh_token });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    const data = res.body.data;
    expect(data.access_token).toEqual(expect.any(String));
    expect(data.refresh_token).toEqual(expect.any(String));
    // 新 access token 应是有效 JWT 字符串（同秒签发可能字面相同，
    // 不强求与旧 token 不同，避免测试 timing 不稳定）
    expect(data.access_token.split('.').length).toBe(3);
    expect(data.user.id).toBe('mock-staff-id');
  });

  // 用 access token 当 refresh_token → 401
  it('POST /api/auth/refresh 用 access token → 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refresh_token: adminTokens.access_token });

    expect(res.status).toBe(401);
  });

  // AC8: @Roles('owner') 守卫 - owner 访问 admin-only → 200
  it('AC8a: GET /api/auth/admin-only 带 owner token → 200', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/auth/admin-only')
      .set('Authorization', `Bearer ${adminTokens.access_token}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.message).toEqual(expect.any(String));
  });

  // AC8: @Roles('owner') 守卫 - client 角色访问 admin-only → 403
  it('AC8b: GET /api/auth/admin-only 带 client token（role 缺失）→ 403', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/auth/admin-only')
      .set('Authorization', `Bearer ${clientTokens.access_token}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe(403);
  });

  // AC8: admin-only 不带 token → 401（先 JwtAuthGuard 拦截）
  it('AC8c: GET /api/auth/admin-only 不带 token → 401', async () => {
    const res = await request(app.getHttpServer()).get('/api/auth/admin-only');

    expect(res.status).toBe(401);
  });

  // 客户端 token 访问 /auth/me → 200 + client 视图
  it('GET /api/auth/me 用 client token → 200 + client 用户视图', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${clientTokens.access_token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.kind).toBe('client');
    expect(res.body.data.id).toBe('mock-client-id');
    expect(res.body.data.openid).toBe('mock-openid');
    // client 不应带 role 字段（@Roles 守卫据此判定 403）
    expect(res.body.data.role).toBeUndefined();
  });

  // AC9: swagger 标注 BearerAuth
  it('AC9: GET /api/docs-json → 200，spec 含 access-token securitySchemes，/auth/me 标注 BearerAuth', async () => {
    const res = await request(app.getHttpServer()).get('/api/docs-json');

    expect(res.status).toBe(200);
    // main.ts 设置了全局前缀 /api，swagger paths 中可能含或不含前缀，
    // 用 Object.keys 找到包含 /auth/me 的路径键，兼容两种形态
    const pathKeys = Object.keys(res.body.paths);
    const mePathKey = pathKeys.find((p) => p.endsWith('/auth/me'));
    expect(mePathKey).toBeDefined();
    // securitySchemes 中应含 access-token
    expect(res.body.components.securitySchemes['access-token']).toBeDefined();
    expect(res.body.components.securitySchemes['access-token'].type).toBe('http');
    // /auth/me 的 get 操作应引用 access-token
    const meGet = res.body.paths[mePathKey].get;
    expect(meGet.security).toEqual([{ 'access-token': [] }]);
    // /auth/login 是 @Public，不应要求 BearerAuth
    const loginPathKey = pathKeys.find((p) => p.endsWith('/auth/login'));
    expect(loginPathKey).toBeDefined();
    const loginPost = res.body.paths[loginPathKey].post;
    expect(loginPost.security ?? []).toEqual([]);
  });
});
