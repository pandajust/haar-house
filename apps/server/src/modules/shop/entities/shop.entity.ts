import type { Prisma } from '@prisma/client';

/**
 * Shop entity 类型 re-export。
 *
 * 直接 re-export Prisma 生成的 Payload 类型，业务模块无需直接依赖 @prisma/client。
 * ShopModule 内部 service 直接通过 PrismaService.shop.* 操作表，
 * entity 类型仅用于 DTO / 业务层类型边界。
 */
export type Shop = Prisma.ShopGetPayload<Record<string, never>>;
