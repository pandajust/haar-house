import type { Prisma } from '@prisma/client';

/**
 * CardTransaction 卡流水 entity 类型 re-export（MemberCardModule）。
 */
export type CardTransaction = Prisma.CardTransactionGetPayload<Record<string, never>>;
