import { randomUUID } from 'crypto';

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PaginatedResult, PaginationDto } from '@/common/dto';
import { PrismaService } from '@/prisma';

import type { CreateClientDto, UpdateClientDto } from './dto/client.dto';
import type { Client } from './entities/client.entity';

/**
 * 客户档案服务。
 *
 * 提供客户 CRUD：列表（支持 name/phone 模糊搜索）、详情、创建、更新、删除。
 * PrismaService 由 @Global PrismaModule 提供，直接注入即可。
 */
@Injectable()
export class ClientService {
  private readonly logger = new Logger(ClientService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 客户列表，支持 keyword 模糊搜索（name / phone）。
   *
   * - 按 created_at desc 排序
   * - keyword 同时匹配 name 和 phone（contains）
   */
  async listClients(
    pagination: PaginationDto,
  ): Promise<PaginatedResult<Client>> {
    const { page, page_size, keyword } = pagination;
    const skip = (page - 1) * page_size;

    const where: Prisma.ClientWhereInput = {};
    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { phone: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const [list, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip,
        take: page_size,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.client.count({ where }),
    ]);

    return { list, total, page, page_size };
  }

  /**
   * 获取单个客户详情。
   */
  async getClient(id: string): Promise<Client> {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) {
      throw new NotFoundException(`客户不存在: ${id}`);
    }
    return client;
  }

  /**
   * 创建客户档案。
   *
   * openid 可选：店内手动建档时可能没有微信 openid，
   * 此时生成唯一占位 openid（shop_<uuid>）以满足 DB NOT NULL UNIQUE 约束。
   * gender / tags 由 DTO 默认值填充（unknown / []）。
   */
  async createClient(data: CreateClientDto): Promise<Client> {
    const openid = data.openid ?? `shop_${randomUUID()}`;
    const client = await this.prisma.client.create({
      data: {
        openid,
        name: data.name,
        phone: data.phone,
        gender: data.gender,
        tags: data.tags,
        note: data.note,
      },
    });
    this.logger.log(`客户已创建: ${client.id} (${client.name})`);
    return client;
  }

  /**
   * 更新客户档案。
   *
   * 仅更新传入的字段；未传字段保持原值。
   * 由于 openid/name 在 DB 中为必填，update input 不接受 undefined，
   * 因此仅在字段有值时才写入。
   */
  async updateClient(
    id: string,
    data: UpdateClientDto,
  ): Promise<Client> {
    // 校验存在
    await this.getClient(id);

    const updateData: Prisma.ClientUpdateInput = {};
    if (data.openid !== undefined) updateData.openid = data.openid;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.note !== undefined) updateData.note = data.note;

    const client = await this.prisma.client.update({
      where: { id },
      data: updateData,
    });
    this.logger.log(`客户已更新: ${id}`);
    return client;
  }

  /**
   * 删除客户档案。
   *
   * 级联删除：客户下的预约会被 onDelete: Cascade 自动删除。
   */
  async deleteClient(id: string): Promise<{ id: string; deleted: true }> {
    await this.getClient(id);
    await this.prisma.client.delete({ where: { id } });
    this.logger.log(`客户已删除: ${id}`);
    return { id, deleted: true };
  }
}