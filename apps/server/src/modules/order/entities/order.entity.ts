import type { Prisma } from '@prisma/client';

/**
 * Order 订单 entity 类型 re-export（OrderModule）。
 */
export type Order = Prisma.OrderGetPayload<Record<string, never>>;
