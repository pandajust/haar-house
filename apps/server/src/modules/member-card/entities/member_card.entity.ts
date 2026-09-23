import type { Prisma } from '@prisma/client';

/**
 * MemberCard 会员卡 entity 类型 re-export（MemberCardModule）。
 *
 * 注意：bound_services 为 UUID[]，Prisma client 不直接类型化（Unsupported），
 * 业务层需要时自行 cast。
 */
export type MemberCard = Prisma.MemberCardGetPayload<Record<string, never>>;
