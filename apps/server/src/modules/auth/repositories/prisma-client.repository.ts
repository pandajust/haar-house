import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/prisma';

import type { ClientRecord, ClientRepository } from '../ports/client.repository';

/**
 * Client 仓储 Prisma 实现。
 *
 * 替换 AuthModule 中的 ClientRepositoryStub，直接查询 client 表。
 * 投影为 auth 模块所需的最小字段集合（id, openid, name, phone）。
 */
@Injectable()
export class PrismaClientRepository implements ClientRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByOpenid(openid: string): Promise<ClientRecord | null> {
    const client = await this.prisma.client.findUnique({ where: { openid } });
    if (!client) return null;
    return {
      id: client.id,
      openid: client.openid,
      name: client.name,
      phone: client.phone ?? undefined,
    };
  }

  async findById(id: string): Promise<ClientRecord | null> {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) return null;
    return {
      id: client.id,
      openid: client.openid,
      name: client.name,
      phone: client.phone ?? undefined,
    };
  }

  async create(data: {
    openid: string;
    name: string;
    phone?: string;
  }): Promise<ClientRecord> {
    const client = await this.prisma.client.create({
      data: {
        openid: data.openid,
        name: data.name,
        phone: data.phone,
      },
    });
    return {
      id: client.id,
      openid: client.openid,
      name: client.name,
      phone: client.phone ?? undefined,
    };
  }
}