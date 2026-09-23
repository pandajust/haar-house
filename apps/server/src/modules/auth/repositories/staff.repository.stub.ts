import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import type { StaffRecord, StaffRepository } from '../ports/staff.repository';

/**
 * Staff 仓储 stub：内存实现，仅用于 dev/test 联调。
 *
 * 内置账号：
 *   username: admin
 *   password: admin123
 *   role:     owner
 *
 * TODO: T10/T11 接入真实 Prisma repository 后替换为
 *       { provide: STAFF_REPOSITORY, useClass: PrismaStaffRepository }
 */
@Injectable()
export class StaffRepositoryStub implements StaffRepository {
  private readonly staff: StaffRecord[];

  constructor() {
    // 用 bcrypt 在内存里预先生成 hash，避免硬编码 hash 难以维护
    const passwordHash = bcrypt.hashSync('admin123', 10);
    this.staff = [
      {
        id: 'mock-staff-id',
        username: 'admin',
        passwordHash,
        role: 'owner',
        name: '店主',
      },
    ];
  }

  async findByUsername(username: string): Promise<StaffRecord | null> {
    return this.staff.find((s) => s.username === username) ?? null;
  }

  async findById(id: string): Promise<StaffRecord | null> {
    return this.staff.find((s) => s.id === id) ?? null;
  }
}
