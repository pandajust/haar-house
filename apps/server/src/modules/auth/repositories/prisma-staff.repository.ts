import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/prisma';

import type { StaffRecord, StaffRepository } from '../ports/staff.repository';

/**
 * Staff 仓储 Prisma 实现。
 *
 * 替换 AuthModule 中的 StaffRepositoryStub，直接查询 staff 表。
 * 投影为 auth 模块所需的最小字段集合（id, username, passwordHash, role, name）。
 */
@Injectable()
export class PrismaStaffRepository implements StaffRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUsername(username: string): Promise<StaffRecord | null> {
    const staff = await this.prisma.staff.findUnique({ where: { username } });
    if (!staff) return null;
    return {
      id: staff.id,
      username: staff.username,
      passwordHash: staff.passwordHash,
      role: staff.role,
      name: staff.name,
    };
  }

  async findById(id: string): Promise<StaffRecord | null> {
    const staff = await this.prisma.staff.findUnique({ where: { id } });
    if (!staff) return null;
    return {
      id: staff.id,
      username: staff.username,
      passwordHash: staff.passwordHash,
      role: staff.role,
      name: staff.name,
    };
  }
}