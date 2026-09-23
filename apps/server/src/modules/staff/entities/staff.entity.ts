import type { Prisma } from '@prisma/client';

/**
 * Staff 员工/理发师 entity 类型 re-export（StaffModule）。
 */
export type Staff = Prisma.StaffGetPayload<Record<string, never>>;
