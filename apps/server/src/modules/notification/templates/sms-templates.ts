import { NotificationType } from '../types/notification.type';

/**
 * 阿里云短信模板配置。
 *
 * - templateCode：阿里云控制台申请到的模板 ID（如 SMS_123456789）
 * - paramKeys：模板中占位符变量名列表，必须与阿里云后台模板严格一致
 *   顺序无关，调用时按 {key: value} 形式传入
 *
 * M1 阶段模板均为占位字符串，业务方拿到真实模板 ID 后替换此处即可。
 * 凭证未配置时 SmsService 走 mock 路径，不会真正调用阿里云 OpenAPI。
 */
export interface SmsTemplateConfig {
  templateCode: string;
  paramKeys: readonly string[];
}

export const SMS_TEMPLATES: Readonly<Record<NotificationType, SmsTemplateConfig>> = {
  [NotificationType.APPOINTMENT_REMINDER]: {
    templateCode: 'SMS_APPOINTMENT_REMINDER',
    paramKeys: ['shop_name', 'staff_name', 'time', 'address'] as const,
  },
  [NotificationType.APPOINTMENT_CONFIRMATION]: {
    templateCode: 'SMS_APPOINTMENT_CONFIRMATION',
    paramKeys: ['shop_name', 'staff_name', 'time', 'service_name'] as const,
  },
  [NotificationType.ORDER_PAID]: {
    templateCode: 'SMS_ORDER_PAID',
    paramKeys: ['shop_name', 'order_no', 'amount'] as const,
  },
  [NotificationType.MEMBER_CARD_LOW_BALANCE]: {
    templateCode: 'SMS_MEMBER_CARD_LOW_BALANCE',
    paramKeys: ['shop_name', 'balance', 'recharge_url'] as const,
  },
  [NotificationType.BIRTHDAY_GREETING]: {
    templateCode: 'SMS_BIRTHDAY_GREETING',
    paramKeys: ['shop_name', 'client_name', 'coupon'] as const,
  },
  [NotificationType.MARKETING_CAMPAIGN]: {
    templateCode: 'SMS_MARKETING_CAMPAIGN',
    paramKeys: ['shop_name', 'campaign_title', 'valid_until'] as const,
  },
};

/**
 * 从 payload 中提取模板参数：仅保留模板声明的字段，丢弃未知字段。
 *
 * 这避免把业务对象的额外字段误传给阿里云（阿里云对未知参数会报错）。
 */
export function pickSmsParams(
  type: NotificationType,
  payload: Record<string, unknown>,
): Record<string, string> {
  const { paramKeys } = SMS_TEMPLATES[type];
  const result: Record<string, string> = {};
  for (const key of paramKeys) {
    const v = payload[key];
    if (v !== undefined && v !== null) {
      result[key] = String(v);
    }
  }
  return result;
}
