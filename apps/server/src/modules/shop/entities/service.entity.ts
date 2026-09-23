import type { Prisma } from '@prisma/client';

/**
 * Service 服务目录 entity 类型 re-export（属于 ShopModule）。
 */
export type Service = Prisma.ServiceGetPayload<Record<string, never>>;
