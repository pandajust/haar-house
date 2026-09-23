import { z } from 'zod';

import { strictObject } from '@/common/pipes/zod-validation.pipe';

/**
 * 单条营业时间规则：weekday 0-6（周日~周六），start/end 为 HH:MM 字符串。
 */
export const businessHourSchema = strictObject({
  weekday: z.number().int().min(0).max(6),
  start: z.string().min(1).max(16),
  end: z.string().min(1).max(16),
});

/**
 * 创建店铺入参。
 *
 * businessHours 存入 shop.business_hours (jsonb)。
 */
export const createShopSchema = strictObject({
  name: z.string().min(1, '店铺名称不能为空').max(100, '店铺名称过长'),
  phone: z.string().min(1, '联系电话不能为空').max(30, '联系电话过长'),
  address: z.string().min(1, '地址不能为空').max(255, '地址过长'),
  businessHours: z.array(businessHourSchema),
});

export type CreateShopDto = z.infer<typeof createShopSchema>;

/**
 * 更新店铺入参：所有字段可选。
 */
export const updateShopSchema = strictObject({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().min(1).max(30).optional(),
  address: z.string().min(1).max(255).optional(),
  businessHours: z.array(businessHourSchema).optional(),
});

export type UpdateShopDto = z.infer<typeof updateShopSchema>;