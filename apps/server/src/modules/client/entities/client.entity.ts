import type { Prisma } from '@prisma/client';

/**
 * Client 客户档案 entity 类型 re-export（ClientModule）。
 */
export type Client = Prisma.ClientGetPayload<Record<string, never>>;
