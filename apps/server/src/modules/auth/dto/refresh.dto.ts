import { z } from 'zod';

import { strictObject } from '@/common/pipes/zod-validation.pipe';

/**
 * 刷新 token 入参 schema。
 *
 * 前端把上一次签发的 refresh_token 通过此接口换发新的一对 access/refresh token。
 */
export const refreshSchema = strictObject({
  refresh_token: z
    .string()
    .min(1, 'refresh_token 不能为空')
    .max(4096, 'refresh_token 过长'),
});

export type RefreshDto = z.infer<typeof refreshSchema>;
