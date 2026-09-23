import { z } from 'zod';

import { strictObject } from '@/common/pipes/zod-validation.pipe';

/**
 * 创建会员卡入参。
 *
 * - type: stored_value（储值卡）/ times（次卡）/ package（套餐）
 * - stored_value 必须传 balance
 * - times / package 必须传 remainingTimes
 * - boundServices: 次卡/套餐绑定的服务 id 列表
 * - expiredAt: 过期时间（可选）
 */
export const createCardSchema = strictObject({
  clientId: z.string().min(1),
  type: z.enum(['stored_value', 'times', 'package']),
  balance: z.coerce.number().min(0).optional(),
  remainingTimes: z.number().int().min(1).optional(),
  boundServices: z.array(z.string().min(1)).optional(),
  expiredAt: z.coerce.date().optional(),
}).refine(
  (v) => {
    if (v.type === 'stored_value') return v.balance !== undefined;
    return v.remainingTimes !== undefined;
  },
  {
    message:
      '储值卡必须传 balance；次卡/套餐必须传 remainingTimes',
    path: ['type'],
  },
);

export type CreateCardDto = z.infer<typeof createCardSchema>;

/**
 * 储值卡充值入参。
 */
export const rechargeSchema = strictObject({
  amount: z.coerce.number().positive(),
});

export type RechargeDto = z.infer<typeof rechargeSchema>;