import type { Role } from '../types/role.type';

/**
 * 员工记录（鉴权侧需要的最小字段集合）。
 *
 * 注意：这是 auth 模块"对外声明"的最小依赖契约，不是 Prisma 模型。
 * T7 的 staff 表可能有更多字段（提成、排班、手机号...），实现方负责投影成此形状。
 */
export interface StaffRecord {
  id: string;
  username: string;
  passwordHash: string;
  role: Role;
  name?: string;
}

/**
 * 依赖反转 token：用于 OOP 风格的 @Inject。
 * 真实实现由 T7/T10/T11 通过 Prisma 提供；本期为 stub 内存实现。
 */
export const STAFF_REPOSITORY = Symbol('STAFF_REPOSITORY');

/**
 * Staff 仓储接口：auth 模块只依赖此接口，不直接依赖 PrismaClient。
 *
 * 后期接入 Prisma 时，由 PrismaModule 提供
 *   { provide: STAFF_REPOSITORY, useClass: PrismaStaffRepository }
 * 替换 stub 即可。
 */
export interface StaffRepository {
  findByUsername(username: string): Promise<StaffRecord | null>;
  findById(id: string): Promise<StaffRecord | null>;
}
