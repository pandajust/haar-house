export { NotificationModule } from './notification.module';
export { NotificationController } from './notification.controller';
export { NotificationService } from './notification.service';
export { SmsService } from './sms.service';
export type { SmsSendOutcome } from './sms.service';
export { WxSubscribeService } from './wx-subscribe.service';
export type { WxSendOutcome } from './wx-subscribe.service';
export { NotificationProcessor } from './queue/notification.processor';
export type { NotificationTask } from './queue/notification.processor';
export * from './types/notification.type';
export type { Channel } from './types/channel.type';
export {
  SMS_TEMPLATES,
  pickSmsParams,
} from './templates/sms-templates';
export type { SmsTemplateConfig } from './templates/sms-templates';
export {
  WX_TEMPLATES,
  buildWxData,
} from './templates/wx-templates';
export type { WxTemplateConfig, WxSubscribeData } from './templates/wx-templates';
