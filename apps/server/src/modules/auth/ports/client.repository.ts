/**
 * 客户记录（鉴权侧需要的最小字段集合）。
 *
 * T7 的 client 表可能有更多字段（性别、标签、备注...），实现方负责投影成此形状。
 */
export interface ClientRecord {
  id: string;
  openid: string;
  name: string;
  phone?: string;
}

/**
 * 依赖反转 token。
 */
export const CLIENT_REPOSITORY = Symbol('CLIENT_REPOSITORY');

/**
 * 客户仓储接口：auth 模块只依赖此接口，不直接依赖 PrismaClient。
 *
 * 后期接入 Prisma 时由 PrismaModule 提供
 *   { provide: CLIENT_REPOSITORY, useClass: PrismaClientRepository }
 * 替换 stub 即可。
 */
export interface ClientRepository {
  findByOpenid(openid: string): Promise<ClientRecord | null>;
  findById(id: string): Promise<ClientRecord | null>;
  create(data: {
    openid: string;
    name: string;
    phone?: string;
  }): Promise<ClientRecord>;
}
