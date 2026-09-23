import type { Prisma } from '@prisma/client';

/**
 * OrderItem 订单明细 entity 类型 re-export（OrderModule）。
 */
export type OrderItem = Prisma.OrderItemGetPayload<Record<string, never>>;
