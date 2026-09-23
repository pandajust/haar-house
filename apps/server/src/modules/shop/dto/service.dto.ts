import { z } from 'zod';

import { strictObject } from '@/common/pipes/zod-validation.pipe';

/**
 * 创建服务项目入参。
 *
 * price 为 decimal(10,2)，DTO 用 number，写入时 Prisma 自动转换。
 */
export const createServiceSchema = strictObject({
  name: z.string().min(1, '服务名称不能为空').max(100, '服务名称过长'),
  description: z.string().max(500, '描述过长').optional(),
  durationMin: z.number().int().positive('时长必须为正整数'),
  price: z.number().nonnegative('价格不能为负'),
  category: z.string().min(1, '分类不能为空').max(50, '分类过长'),
  imageUrl: z.string().url('图片地址不合法').optional(),
  isActive: z.boolean().optional(),
});

export type CreateServiceDto = z.infer<typeof createServiceSchema>;

/**
 * 更新服务项目入参：所有字段可选。
 */
export const updateServiceSchema = strictObject({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  durationMin: z.number().int().positive().optional(),
  price: z.number().nonnegative().optional(),
  category: z.string().min(1).max(50).optional(),
  imageUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateServiceDto = z.infer<typeof updateServiceSchema>;