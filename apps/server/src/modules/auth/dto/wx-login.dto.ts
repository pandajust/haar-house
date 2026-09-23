import { z } from 'zod';

import { strictObject } from '@/common/pipes/zod-validation.pipe';

/**
 * 微信小程序登录入参 schema。
 *
 * 小程序前端调用 wx.login() 拿到 code 后 POST 给后端，
 * 后端再调用 https://api.weixin.qq.com/sns/jscode2session 换取 openid + session_key。
 */
export const wxLoginSchema = strictObject({
  code: z
    .string()
    .min(1, 'code 不能为空')
    .max(256, 'code 过长'),
});

export type WxLoginDto = z.infer<typeof wxLoginSchema>;
