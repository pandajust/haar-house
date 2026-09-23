import { z } from 'zod';

import { strictObject } from '@/common/pipes/zod-validation.pipe';

/**
 * 员工角色枚举（与 Prisma StaffRole / auth Role 一致）。
 */
const roleEnum = z.enum(['owner', 'manager', 'stylist', 'assistant', 'admin']);

/**
 * 创建员工入参。
 *
 * - password 明文传入，service 层用 bcrypt 10 轮生成 passwordHash。
 * - username 全局唯一，冲突时 service 抛 ConflictException。
 * - commissionRate 为 decimal(5,4)，范围 0~1。
 */
export const createStaffSchema = strictObject({
  shopId: z.string().uuid('shopId 必须为合法 UUID'),
  name: z.string().min(1, '姓名不能为空').max(50, '姓名过长'),
  phone: z.string().min(1, '手机号不能为空').max(30, '手机号过长'),
  username: z.string().min(1, '用户名不能为空').max(64, '用户名过长'),
  password: z.string().min(6, '密码至少 6 位').max(128, '密码过长'),
  role: roleEnum,
  avatar: z.string().url('头像地址不合法').optional(),
  bio: z.string().max(500, '简介过长').optional(),
  commissionRate: z.number().min(0, '提成比例不能为负').max(1, '提成比例不能超过 1').optional(),
});

export type CreateStaffDto = z.infer<typeof createStaffSchema>;

/**
 * 更新员工入参：所有字段可选。
 *
 * password 可选；提供时才更新 passwordHash。
 */
export const updateStaffSchema = strictObject({
  shopId: z.string().uuid().optional(),
  name: z.string().min(1).max(50).optional(),
  phone: z.string().min(1).max(30).optional(),
  username: z.string().min(1).max(64).optional(),
  password: z.string().min(6).max(128).optional(),
  role: roleEnum.optional(),
  avatar: z.string().url().optional(),
  bio: z.string().max(500).optional(),
  commissionRate: z.number().min(0).max(1).optional(),
});

export type UpdateStaffDto = z.infer<typeof updateStaffSchema>;