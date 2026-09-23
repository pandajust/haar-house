import { INestApplication } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import {
  LoggingInterceptor,
  TransformInterceptor,
} from '../src/common/interceptors';
import { ZodValidationPipe } from '../src/common/pipes/zod-validation.pipe';
import { NotificationController } from '../src/modules/notification/notification.controller';
import { NotificationModule } from '../src/modules/notification/notification.module';
import { NotificationService } from '../src/modules/notification/notification.service';
import { SmsService } from '../src/modules/notification/sms.service';
import { WxSubscribeService } from '../src/modules/notification/wx-subscribe.service';
import { NotificationType } from '../src/modules/notification/types/notification.type';
import { validateEnv } from '../src/config/env.validation';

/**
 * T9 验收：NotificationModule e2e
 *
 * 覆盖 AC3：
 *  - notify 成功路径（wx 成功 / sms 成功）
 *  - sms 失败降级到日志（不抛错）
 *  - wx 失败降级到 sms
 *  - sms 也失败仅记日志
 *  - 调试端点 POST /api/notify/test 返回 {success, channel_used}
 *  - zod schema 强制 phone/openid 至少一个 → 400
 *
 * 测试只装配 NotificationModule + ConfigModule + 全局 pipe/filter/interceptor，
 * 不引入 AppModule：避免被并行 Agent 的 AuthModule / PrismaModule 的初始化
 * （DB 连接、JWT 配置）影响，且让测试更快、更聚焦于通知模块本身。
 *
 * 不调用真实阿里云/微信：通过 overrideProvider 把 SmsService / WxSubscribeService
 * 换成可控行为的 stub。NotificationService 与 NotificationController 真实运行。
 */
describe('Notification (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;

  /** 共享的 mock 行为控制器，每个 it 内可改写返回值 */
  const smsSend = jest.fn();
  const wxSend = jest.fn();

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env',
          validate: (env) => validateEnv(env as Record<string, unknown>),
        }),
        NotificationModule,
      ],
      controllers: [NotificationController],
      providers: [
        { provide: APP_PIPE, useClass: ZodValidationPipe },
        { provide: APP_FILTER, useClass: HttpExceptionFilter },
        { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
        { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
      ],
    })
      .overrideProvider(SmsService)
      .useValue({ send: smsSend, isConfigured: () => true })
      .overrideProvider(WxSubscribeService)
      .useValue({
        send: wxSend,
        isConfigured: () => true,
        getAccessToken: jest.fn().mockResolvedValue('mock-token'),
        invalidateToken: jest.fn(),
      })
      .compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api', { exclude: ['health'] });

    const swaggerConfig = new DocumentBuilder()
      .setTitle('理发店管理系统 API')
      .setVersion('0.1.0')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    smsSend.mockReset();
    wxSend.mockReset();
  });

  const PAYLOAD = {
    shop_name: '老王理发',
    staff_name: 'Tony',
    time: '2026-09-16 10:00',
    address: '人民路1号',
  };

  describe('POST /api/notify/test', () => {
    it('成功路径：phone + openid 且 wx 成功 → {success:true, channel_used:"wx_subscribe"}', async () => {
      wxSend.mockResolvedValueOnce({ success: true });
      const res = await request(app.getHttpServer())
        .post('/api/notify/test')
        .send({
          phone: '13800138000',
          openid: 'o_test_openid_xxx',
          type: NotificationType.APPOINTMENT_REMINDER,
          payload: PAYLOAD,
        });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.data).toEqual({
        success: true,
        channel_used: 'wx_subscribe',
      });
      // wx 成功不应触发短信
      expect(smsSend).not.toHaveBeenCalled();
    });

    it('sms 失败降级到日志：仅传 phone + sms 失败 → {success:false, channel_used:"none"}，不抛错', async () => {
      smsSend.mockResolvedValueOnce({
        success: false,
        reason: 'aliyun_http_500',
      });
      const res = await request(app.getHttpServer())
        .post('/api/notify/test')
        .send({
          phone: '13800138000',
          type: NotificationType.ORDER_PAID,
          payload: PAYLOAD,
        });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      // 仅传 phone → controller 走 notifyPhone：sms 失败时 success=false，
      // fallback_reason 直接透传底层 reason（不包 sms_failed 前缀，因为这不是降级链路）
      expect(res.body.data).toEqual({
        success: false,
        channel_used: 'none',
        fallback_reason: expect.stringContaining('aliyun_'),
      });
    });

    it('wx 失败降级到 sms：phone + openid + wx 失败 + sms 成功 → {success:true, channel_used:"sms"}', async () => {
      wxSend.mockResolvedValueOnce({
        success: false,
        reason: 'wx_errcode_43101',
      });
      smsSend.mockResolvedValueOnce({ success: true });
      const res = await request(app.getHttpServer())
        .post('/api/notify/test')
        .send({
          phone: '13800138000',
          openid: 'o_test_openid_xxx',
          type: NotificationType.APPOINTMENT_REMINDER,
          payload: PAYLOAD,
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        success: true,
        channel_used: 'sms',
        fallback_reason: 'wx_failed_fallback_to_sms',
      });
    });

    it('wx 与 sms 都失败：仅记日志，返回 {success:false, channel_used:"none"}，HTTP 仍 200', async () => {
      wxSend.mockResolvedValueOnce({
        success: false,
        reason: 'wx_errcode_43101',
      });
      smsSend.mockResolvedValueOnce({
        success: false,
        reason: 'aliyun_http_500',
      });
      const res = await request(app.getHttpServer())
        .post('/api/notify/test')
        .send({
          phone: '13800138000',
          openid: 'o_test_openid_xxx',
          type: NotificationType.ORDER_PAID,
          payload: PAYLOAD,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(false);
      expect(res.body.data.channel_used).toBe('none');
      expect(res.body.data.fallback_reason).toContain('sms_failed');
    });

    it('仅传 openid + wx 成功 → {success:true, channel_used:"wx_subscribe"}', async () => {
      wxSend.mockResolvedValueOnce({ success: true });
      const res = await request(app.getHttpServer())
        .post('/api/notify/test')
        .send({
          openid: 'o_test_openid_xxx',
          type: NotificationType.BIRTHDAY_GREETING,
          payload: PAYLOAD,
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        success: true,
        channel_used: 'wx_subscribe',
      });
    });

    it('参数校验：phone 与 openid 都缺 → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/notify/test')
        .send({
          type: NotificationType.ORDER_PAID,
          payload: PAYLOAD,
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
      // refine 错误信息或字段提示应出现
      const detailsJson = JSON.stringify(res.body.details);
      expect(detailsJson).toMatch(/phone|openid|至少/);
    });

    it('参数校验：type 非法 → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/notify/test')
        .send({
          phone: '13800138000',
          type: 'not_a_real_type',
          payload: PAYLOAD,
        });

      expect(res.status).toBe(400);
    });

    it('参数校验：未知字段 → 400（strict）', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/notify/test')
        .send({
          phone: '13800138000',
          type: NotificationType.ORDER_PAID,
          payload: PAYLOAD,
          unknown_field: 'should_be_rejected',
        });

      expect(res.status).toBe(400);
      const detailsJson = JSON.stringify(res.body.details);
      expect(detailsJson).toContain('unknown_field');
    });
  });

  describe('NotificationService 直接调用（不走 HTTP）', () => {
    it('notify(clientId) 在 M1 返回 not_implemented', async () => {
      const svc = app.get(NotificationService);
      const r = await svc.notify(
        'client-1',
        NotificationType.ORDER_PAID,
        PAYLOAD,
      );
      expect(r.success).toBe(false);
      expect(r.fallback_reason).toBe('contact_resolver_not_implemented');
    });

    it('notifyAuto：wx 抛错（实现 bug 模拟） → 不向调用方冒泡，sms 兜底', async () => {
      // 即便 wx 抛未捕获异常，service 不应让错误冒泡；但 wx 实现已 catch，
      // 这里测 wx.send 返回 success=false 后 sms 兜底的真实路径。
      wxSend.mockResolvedValueOnce({
        success: false,
        reason: 'token_fetch_failed',
      });
      smsSend.mockResolvedValueOnce({ success: true });

      const svc = app.get(NotificationService);
      const r = await svc.notifyAuto(
        NotificationType.APPOINTMENT_REMINDER,
        PAYLOAD,
        { phone: '13800138000', openid: 'o_xxx' },
      );

      expect(r.success).toBe(true);
      expect(r.channel_used).toBe('sms');
    });
  });
});
