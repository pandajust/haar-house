import { NotificationType } from '../types/notification.type';

/**
 * 微信订阅消息模板配置。
 *
 * - templateId：微信公众平台「订阅消息」模板 ID
 * - fieldMap：key=微信模板字段名（如 thing1、time2），value=payload 字段名
 *   将业务 payload 映射成微信模板要求的 data 结构
 *
 * M1 阶段 templateId 为占位字符串，业务方申请到真实模板后替换。
 * 凭证未配置时 WxSubscribeService 走 mock 路径，不会真正调用微信 OpenAPI。
 */
export interface WxTemplateConfig {
  templateId: string;
  fieldMap: Readonly<Record<string, string>>;
}

export const WX_TEMPLATES: Readonly<Record<NotificationType, WxTemplateConfig>> = {
  [NotificationType.APPOINTMENT_REMINDER]: {
    templateId: 'WX_APPOINTMENT_REMINDER',
    fieldMap: {
      thing1: 'shop_name',
      thing2: 'staff_name',
      time3: 'time',
      thing4: 'address',
    },
  },
  [NotificationType.APPOINTMENT_CONFIRMATION]: {
    templateId: 'WX_APPOINTMENT_CONFIRMATION',
    fieldMap: {
      thing1: 'shop_name',
      thing2: 'staff_name',
      time3: 'time',
      thing4: 'service_name',
    },
  },
  [NotificationType.ORDER_PAID]: {
    templateId: 'WX_ORDER_PAID',
    fieldMap: {
      thing1: 'shop_name',
      character_string2: 'order_no',
      amount3: 'amount',
    },
  },
  [NotificationType.MEMBER_CARD_LOW_BALANCE]: {
    templateId: 'WX_MEMBER_CARD_LOW_BALANCE',
    fieldMap: {
      thing1: 'shop_name',
      amount2: 'balance',
      thing3: 'recharge_url',
    },
  },
  [NotificationType.BIRTHDAY_GREETING]: {
    templateId: 'WX_BIRTHDAY_GREETING',
    fieldMap: {
      thing1: 'shop_name',
      thing2: 'client_name',
      thing3: 'coupon',
    },
  },
  [NotificationType.MARKETING_CAMPAIGN]: {
    templateId: 'WX_MARKETING_CAMPAIGN',
    fieldMap: {
      thing1: 'shop_name',
      thing2: 'campaign_title',
      date3: 'valid_until',
    },
  },
};

/**
 * 微信小程序订阅消息 data 结构：键为模板字段名，值为 {value: string}。
 * 微信侧不支持数字类型，统一转 string。
 */
export interface WxSubscribeData {
  [key: string]: { value: string };
}

/**
 * 从 payload 映射出微信订阅消息 data。
 * 未在 fieldMap 中声明的 payload 字段会被丢弃，避免微信侧报错。
 */
export function buildWxData(
  type: NotificationType,
  payload: Record<string, unknown>,
): WxSubscribeData {
  const { fieldMap } = WX_TEMPLATES[type];
  const data: WxSubscribeData = {};
  for (const [wxKey, payloadKey] of Object.entries(fieldMap)) {
    const v = payload[payloadKey];
    if (v !== undefined && v !== null) {
      data[wxKey] = { value: String(v) };
    }
  }
  return data;
}
