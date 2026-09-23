import type { Prisma } from '@prisma/client';

/**
 * Coupon 优惠券 entity 类型 re-export（MarketingModule）。
 */
export type Coupon = Prisma.CouponGetPayload<Record<string, never>>;
