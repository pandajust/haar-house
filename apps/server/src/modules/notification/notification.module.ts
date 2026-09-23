import { Global, Module } from '@nestjs/common';

import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationProcessor } from './queue/notification.processor';
import { SmsService } from './sms.service';
import { WxSubscribeService } from './wx-subscribe.service';

/**
 * 通知模块（全局模块）。
 *
 * 全局注册便于任意业务模块注入 NotificationService 而无需在每处 imports 中重复。
 * 仅暴露 service 门面 + processor 给 DI；底层 Sms/Wx service 是内部实现细节，
 * 通过 NotificationService 间接调用；同时仍然 export 出去以便测试 overrideProvider。
 *
 * M1 不接 BullMQ / Redis：NotificationProcessor 是 setImmediate stub，
 * 后续 T7+ 接入 Redis 时可在此模块 replace 为 BullQueue provider。
 */
@Global()
@Module({
  providers: [
    NotificationProcessor,
    SmsService,
    WxSubscribeService,
    NotificationService,
  ],
  controllers: [NotificationController],
  exports: [
    NotificationService,
    NotificationProcessor,
    SmsService,
    WxSubscribeService,
  ],
})
export class NotificationModule {}
