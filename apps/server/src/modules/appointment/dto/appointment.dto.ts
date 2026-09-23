import { z } from 'zod';

import { strictObject } from '@/common/pipes/zod-validation.pipe';

/**
 * 预约状态枚举。
 *
 * 状态机：
 *   pending → confirmed → in_service → done
 *   任何状态 → canceled
 *   confirmed / in_service → no_show
 */
export const appointmentStatusEnum = z.enum([
  'pending',
  'confirmed',
  'in_service',
  'done',
  'canceled',
  'no_show',
]);

export type AppointmentStatusDto = z.infer<typeof appointmentStatusEnum>;

/**
 * 创建预约入参 schema。
 *
 * - startTime: ISO 字符串，z.coerce.date() 解析为 Date
 * - durationMin: 服务时长（分钟），正整数
 * - source: 预约来源，默认 mini
 */
export const createAppointmentSchema = strictObject({
  clientId: z.string().uuid('clientId 必须是合法 UUID'),
  staffId: z.string().uuid('staffId 必须是合法 UUID'),
  serviceId: z.string().uuid('serviceId 必须是合法 UUID'),
  startTime: z.coerce.date(),
  durationMin: z.number().int().min(1, '时长至少 1 分钟').max(480, '时长不超过 480 分钟'),
  source: z.enum(['mini', 'shop']).default('mini'),
  note: z.string().max(500).optional(),
});

export type CreateAppointmentDto = z.infer<typeof createAppointmentSchema>;

/**
 * 更新预约入参 schema。
 *
 * 全部字段可选；严格模式拒绝未声明字段。
 * 不允许通过 update 修改 status（状态变更走 updateStatus）。
 */
export const updateAppointmentSchema = strictObject({
  clientId: z.string().uuid('clientId 必须是合法 UUID').optional(),
  staffId: z.string().uuid('staffId 必须是合法 UUID').optional(),
  serviceId: z.string().uuid('serviceId 必须是合法 UUID').optional(),
  startTime: z.coerce.date().optional(),
  durationMin: z
    .number()
    .int()
    .min(1, '时长至少 1 分钟')
    .max(480, '时长不超过 480 分钟')
    .optional(),
  source: z.enum(['mini', 'shop']).optional(),
  note: z.string().max(500).optional(),
});

export type UpdateAppointmentDto = z.infer<typeof updateAppointmentSchema>;

/**
 * 状态更新入参 schema。
 */
export const updateStatusSchema = strictObject({
  status: appointmentStatusEnum,
});

export type UpdateStatusDto = z.infer<typeof updateStatusSchema>;
/**
 * 预约列表查询 schema（分页 + 筛选）。
 *
 * 复用分页字段，叠加 status / staffId / date 筛选。
 * date 格式 YYYY-MM-DD，按当天 startTime 筛选。
 */
export const listAppointmentsQuerySchema = strictObject({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(200).default(20),
  sort: z.string().max(64).optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
  keyword: z.string().max(64).optional(),
  status: appointmentStatusEnum.optional(),
  staffId: z.string().uuid().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date 格式应为 YYYY-MM-DD')
    .optional(),
});

export type ListAppointmentsQueryDto = z.infer<
  typeof listAppointmentsQuerySchema
>;
