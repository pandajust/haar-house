import { z } from 'zod';

import { strictObject } from '@/common/pipes/zod-validation.pipe';

/**
 * HH:MM:SS 时间字符串正则（24 小时制）。
 */
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;

/**
 * 创建排班入参。
 *
 * - weekday: 0=周日, 1=周一, ..., 6=周六
 * - startTime / endTime: "HH:MM:SS"，对应 staff_schedule.start_time / end_time (time 类型)
 * - effectiveFrom / effectiveTo: 生效起止日期（ISO 日期字符串），对应 @db.Date
 */
export const createScheduleSchema = strictObject({
  weekday: z.number().int().min(0).max(6),
  startTime: z.string().regex(timeRegex, '开始时间格式应为 HH:MM:SS'),
  endTime: z.string().regex(timeRegex, '结束时间格式应为 HH:MM:SS'),
  effectiveFrom: z.string().min(1, '生效起始日期不能为空'),
  effectiveTo: z.string().min(1).optional(),
});

export type CreateScheduleDto = z.infer<typeof createScheduleSchema>;

/**
 * 更新排班入参：所有字段可选。
 */
export const updateScheduleSchema = strictObject({
  weekday: z.number().int().min(0).max(6).optional(),
  startTime: z.string().regex(timeRegex).optional(),
  endTime: z.string().regex(timeRegex).optional(),
  effectiveFrom: z.string().min(1).optional(),
  effectiveTo: z.string().min(1).optional(),
});

export type UpdateScheduleDto = z.infer<typeof updateScheduleSchema>;