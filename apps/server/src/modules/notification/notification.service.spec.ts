import { Test, TestingModule } from '@nestjs/testing';

import { NotificationProcessor } from './queue/notification.processor';
import { NotificationService } from './notification.service';
import { SmsService } from './sms.service';
import { WxSubscribeService } from './wx-subscribe.service';
import { NotificationType } from './types/notification.type';

/**
 * NotificationService 单元测试。
 *
 * 覆盖：
 *  - notifyAuto 各降级路径（wx 成功 / wx 失败回退 sms / sms 也失败 / 无联系方式）
 *  - notifyPhone / notifyOpenid 成功与失败路径
 *  - notify(clientId) M1 未实现路径
 *  - enqueueAuto 异步入队
 *
 * 不调用真实阿里云/微信：SmsService / WxSubscribeService 用 jest.spyOn
 * 直接 mock 方法返回值，保留 NotificationService 自身逻辑不被替换。
 */
describe('NotificationService', () => {
  let service: NotificationService;
  let sms: SmsService;
  let wx: WxSubscribeService;
  let processor: NotificationProcessor;
  let module: TestingModule;

  const PAYLOAD = { shop_name: '老王理发', staff_name: 'Tony', time: '2026-09-16 10:00' };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: SmsService,
          useValue: {
            send: jest.fn(),
            isConfigured: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: WxSubscribeService,
          useValue: {
            send: jest.fn(),
            isConfigured: jest.fn().mockReturnValue(true),
            getAccessToken: jest.fn(),
            invalidateToken: jest.fn(),
          },
        },
        {
          provide: NotificationProcessor,
          useValue: {
            enqueue: jest.fn(),
            drain: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get(NotificationService);
    sms = module.get(SmsService);
    wx = module.get(WxSubscribeService);
    processor = module.get(NotificationProcessor);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('notify(clientId, ...)', () => {
    it('M1 阶段返回 not_implemented，不抛错', async () => {
      const r = await service.notify(
        'client-1',
        NotificationType.APPOINTMENT_REMINDER,
        PAYLOAD,
      );
      expect(r.success).toBe(false);
      expect(r.channel_used).toBe('none');
      expect(r.fallback_reason).toBe('contact_resolver_not_implemented');
    });

    it('channel 参数不会改变 M1 行为', async () => {
      const r = await service.notify(
        'client-2',
        NotificationType.ORDER_PAID,
        PAYLOAD,
        'sms',
      );
      expect(r.success).toBe(false);
    });
  });

  describe('notifyPhone', () => {
    it('短信成功 → channel_used=sms', async () => {
      (sms.send as jest.Mock).mockResolvedValueOnce({ success: true });
      const r = await service.notifyPhone(
        '13800138000',
        NotificationType.ORDER_PAID,
        PAYLOAD,
      );
      expect(r.success).toBe(true);
      expect(r.channel_used).toBe('sms');
      expect(r.fallback_reason).toBeUndefined();
    });

    it('短信失败 → success=false 不抛错', async () => {
      (sms.send as jest.Mock).mockResolvedValueOnce({
        success: false,
        reason: 'aliyun_isv_BUSINESS_LIMIT_CONTROL',
      });
      const r = await service.notifyPhone(
        '13800138000',
        NotificationType.ORDER_PAID,
        PAYLOAD,
      );
      expect(r.success).toBe(false);
      expect(r.channel_used).toBe('none');
      expect(r.fallback_reason).toContain('aliyun_');
    });
  });

  describe('notifyOpenid', () => {
    it('微信成功 → channel_used=wx_subscribe', async () => {
      (wx.send as jest.Mock).mockResolvedValueOnce({ success: true });
      const r = await service.notifyOpenid(
        'o_xxx_openid_yyy',
        NotificationType.APPOINTMENT_REMINDER,
        PAYLOAD,
      );
      expect(r.success).toBe(true);
      expect(r.channel_used).toBe('wx_subscribe');
    });

    it('微信失败（用户未订阅） → success=false 不抛错', async () => {
      (wx.send as jest.Mock).mockResolvedValueOnce({
        success: false,
        reason: 'wx_errcode_43101',
      });
      const r = await service.notifyOpenid(
        'o_xxx_openid_yyy',
        NotificationType.APPOINTMENT_REMINDER,
        PAYLOAD,
      );
      expect(r.success).toBe(false);
      expect(r.channel_used).toBe('none');
      expect(r.fallback_reason).toContain('wx_errcode');
    });
  });

  describe('notifyAuto（降级链路）', () => {
    it('有 openid + wx 成功 → 走 wx_subscribe', async () => {
      (wx.send as jest.Mock).mockResolvedValueOnce({ success: true });
      const r = await service.notifyAuto(
        NotificationType.APPOINTMENT_REMINDER,
        PAYLOAD,
        { phone: '13800138000', openid: 'o_xxx_openid_yyy' },
      );
      expect(r.success).toBe(true);
      expect(r.channel_used).toBe('wx_subscribe');
      // wx 成功时不应调用 sms
      expect(sms.send).not.toHaveBeenCalled();
    });

    it('有 openid + wx 失败 + phone 成功 → 回退 sms', async () => {
      (wx.send as jest.Mock).mockResolvedValueOnce({
        success: false,
        reason: 'wx_errcode_43101',
      });
      (sms.send as jest.Mock).mockResolvedValueOnce({ success: true });
      const r = await service.notifyAuto(
        NotificationType.APPOINTMENT_REMINDER,
        PAYLOAD,
        { phone: '13800138000', openid: 'o_xxx_openid_yyy' },
      );
      expect(r.success).toBe(true);
      expect(r.channel_used).toBe('sms');
      expect(r.fallback_reason).toBe('wx_failed_fallback_to_sms');
    });

    it('有 openid + wx 失败 + 无 phone → 直接失败', async () => {
      (wx.send as jest.Mock).mockResolvedValueOnce({
        success: false,
        reason: 'wx_errcode_43101',
      });
      const r = await service.notifyAuto(
        NotificationType.APPOINTMENT_REMINDER,
        PAYLOAD,
        { openid: 'o_xxx_openid_yyy' },
      );
      expect(r.success).toBe(false);
      expect(r.channel_used).toBe('none');
      expect(r.fallback_reason).toContain('wx_failed_and_no_phone');
      expect(sms.send).not.toHaveBeenCalled();
    });

    it('有 phone + 无 openid + sms 成功 → 走 sms，不标降级', async () => {
      (sms.send as jest.Mock).mockResolvedValueOnce({ success: true });
      const r = await service.notifyAuto(
        NotificationType.ORDER_PAID,
        PAYLOAD,
        { phone: '13800138000' },
      );
      expect(r.success).toBe(true);
      expect(r.channel_used).toBe('sms');
      expect(r.fallback_reason).toBeUndefined();
      expect(wx.send).not.toHaveBeenCalled();
    });

    it('有 phone + 无 openid + sms 失败 → 仅记日志，不抛错', async () => {
      (sms.send as jest.Mock).mockResolvedValueOnce({
        success: false,
        reason: 'aliyun_http_500',
      });
      const r = await service.notifyAuto(
        NotificationType.ORDER_PAID,
        PAYLOAD,
        { phone: '13800138000' },
      );
      expect(r.success).toBe(false);
      expect(r.channel_used).toBe('none');
      expect(r.fallback_reason).toContain('sms_failed');
    });

    it('有 phone + openid + wx 与 sms 都失败 → 仅记日志不抛错', async () => {
      (wx.send as jest.Mock).mockResolvedValueOnce({
        success: false,
        reason: 'wx_errcode_43101',
      });
      (sms.send as jest.Mock).mockResolvedValueOnce({
        success: false,
        reason: 'aliyun_http_500',
      });
      const r = await service.notifyAuto(
        NotificationType.ORDER_PAID,
        PAYLOAD,
        { phone: '13800138000', openid: 'o_xxx_openid_yyy' },
      );
      expect(r.success).toBe(false);
      expect(r.channel_used).toBe('none');
      expect(r.fallback_reason).toContain('sms_failed');
    });

    it('无 phone 无 openid → no_contact_info', async () => {
      const r = await service.notifyAuto(
        NotificationType.ORDER_PAID,
        PAYLOAD,
        {},
      );
      expect(r.success).toBe(false);
      expect(r.channel_used).toBe('none');
      expect(r.fallback_reason).toBe('no_contact_info');
    });
  });

  describe('enqueueAuto', () => {
    it('入队一个 setImmediate 任务，processor.enqueue 被调用', () => {
      service.enqueueAuto(NotificationType.ORDER_PAID, PAYLOAD, {
        phone: '13800138000',
      });
      expect(processor.enqueue).toHaveBeenCalledTimes(1);
      const task = (processor.enqueue as jest.Mock).mock.calls[0][0];
      expect(task.source).toBe('enqueueAuto');
      expect(typeof task.exec).toBe('function');
    });
  });
});
