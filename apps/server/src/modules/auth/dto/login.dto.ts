import { z } from 'zod';

import { strictObject } from '@/common/pipes/zod-validation.pipe';

/**
 * 账密登录入参 schema。
 *
 * 严格模式（strict）：拒绝未声明字段，等价于 whitelist + forbidNonWhitelisted。
 */
export const loginSchema = strictObject({
  username: z
    .string()
    .min(1, '用户名不能为空')
    .max(64, '用户名过长'),
  password: z
    .string()
    .min(1, '密码不能为空')
    .max(128, '密码过长'),
});

export type LoginDto = z.infer<typeof loginSchema>;
