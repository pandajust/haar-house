import type { Prisma } from '@prisma/client';

/**
 * StaffSchedule 排班 entity 类型 re-export（StaffModule）。
 *
 * 注意：start_time / end_time 为 PostgreSQL `time` 类型，
 * Prisma client 不直接类型化（Unsupported），需要业务层自行 cast 为字符串。
 */
export type StaffSchedule = Prisma.StaffScheduleGetPayload<Record<string, never>>;
