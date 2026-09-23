import { z } from 'zod';

import { strictObject } from '@/common/pipes/zod-validation.pipe';

/**
 * 创建客户入参 schema。
 *
 * - openid 可选：店内手动建档时可能没有微信 openid
 * - name 必填
 * - phone 可选
 * - gender 默认 unknown
 * - tags 默认空数组
 */
export const createClientSchema = strictObject({
  openid: z.string().max(64).optional(),
  name: z.string().min(1, '姓名不能为空').max(64, '姓名过长'),
  phone: z.string().max(20).optional(),
  gender: z.enum(['male', 'female', 'unknown']).default('unknown'),
  tags: z.array(z.string().max(32)).default([]),
  note: z.string().max(500).optional(),
});

export type CreateClientDto = z.infer<typeof createClientSchema>;

/**
 * 更新客户入参 schema。
 *
 * 全部字段可选；严格模式拒绝未声明字段。
 */
export const updateClientSchema = strictObject({
  openid: z.string().max(64).optional(),
  name: z.string().min(1, '姓名不能为空').max(64, '姓名过长').optional(),
  phone: z.string().max(20).optional(),
  gender: z.enum(['male', 'female', 'unknown']).optional(),
  tags: z.array(z.string().max(32)).optional(),
  note: z.string().max(500).optional(),
});

export type UpdateClientDto = z.infer<typeof updateClientSchema>;