import { Injectable } from '@nestjs/common';

import type { ClientRecord, ClientRepository } from '../ports/client.repository';

/**
 * Client 仓储 stub：内存实现，仅用于 dev/test 联调。
 *
 * 内置 mock 客户：
 *   id:     mock-client-id
 *   openid: mock-openid
 *   name:   测试客户
 *
 * TODO: T10/T11 接入真实 Prisma repository 后替换。
 */
@Injectable()
export class ClientRepositoryStub implements ClientRepository {
  private readonly clients: ClientRecord[] = [
    {
      id: 'mock-client-id',
      openid: 'mock-openid',
      name: '测试客户',
    },
  ];

  async findByOpenid(openid: string): Promise<ClientRecord | null> {
    return this.clients.find((c) => c.openid === openid) ?? null;
  }

  async findById(id: string): Promise<ClientRecord | null> {
    return this.clients.find((c) => c.id === id) ?? null;
  }

  async create(data: {
    openid: string;
    name: string;
    phone?: string;
  }): Promise<ClientRecord> {
    const created: ClientRecord = {
      id: `mock-client-${Date.now()}`,
      openid: data.openid,
      name: data.name,
      phone: data.phone,
    };
    this.clients.push(created);
    return created;
  }
}
