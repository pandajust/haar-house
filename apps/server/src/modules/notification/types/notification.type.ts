/**
 * 通知类型枚举。
 *
 * 每个值对应一种业务场景，决定使用哪个短信模板 ID / 微信订阅模板 ID。
 * 命名采用 snake_case 以与外部 SDK 模板配置保持一致。
 */
export enum NotificationType {
  /** 预约提醒：到店前 30 分钟提醒客户 */
  APPOINTMENT_REMINDER = 'appointment_reminder',
  /** 预约确认：客户下单后立即确认 */
  APPOINTMENT_CONFIRMATION = 'appointment_confirmation',
  /** 订单支付成功 */
  ORDER_PAID = 'order_paid',
  /** 会员卡余额不足预警 */
  MEMBER_CARD_LOW_BALANCE = 'member_card_low_balance',
  /** 生日祝福 */
  BIRTHDAY_GREETING = 'birthday_greeting',
  /** 营销活动推送 */
  MARKETING_CAMPAIGN = 'marketing_campaign',
}

/**
 * 通知 payload 中携带的客户联系方式（可选）。
 *
 * 由调用方根据其上下文填充；notify(clientId,...) 的 M1 stub 不依赖此字段，
 * 但 notifyPhone/notifyOpenid 的调试端点会直接使用。
 */
export interface NotificationContact {
  phone?: string;
  openid?: string;
}

/**
 * 通知发送结果。
 *
 * 不论底层通道是否成功，service 都返回此结构而不抛错。
 * 上层依据 success 决定后续动作（如重试或记监控）。
 */
export interface NotificationResult {
  /** 是否成功送达（含 dev mock 成功） */
  success: boolean;
  /** 实际使用的通道；全部失败时为 'none' */
  channel_used: 'sms' | 'wx_subscribe' | 'none';
  /** 失败时的原因说明（用于排查/监控） */
  fallback_reason?: string;
}
