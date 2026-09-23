/**
 * 通知通道。
 *
 * - 'sms'：阿里云短信，强送达，无前端交互
 * - 'wx_subscribe'：微信小程序订阅消息，需用户主动订阅，免费但触达弱
 * - 'auto'：默认策略，优先 wx_subscribe（openid 存在时），失败回退 sms
 */
export type Channel = 'sms' | 'wx_subscribe' | 'auto';
