import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '@/prisma';
import type { PaginationDto, PaginatedResult } from '@/common/dto';

import type { Staff } from './entities/staff.entity';
import type { StaffSchedule } from './entities/staff_schedule.entity';
import type { CreateStaffDto, UpdateStaffDto } from './dto/staff.dto';
import type {
  CreateScheduleDto,
  UpdateScheduleDto,
} from './dto/schedule.dto';

/**
 * 员工与排班业务服务。
 *
 * - password 明文由 service 层用 bcrypt 10 轮哈希后写入 password_hash。
 * - username 唯一，创建/更新冲突时抛 ConflictException。
 * - staff_schedule.start_time / end_time 为 PostgreSQL time 类型，
 *   Prisma schema 中声明为 Unsupported("time")，导致 prisma.staffSchedule.create
 *   与 update 输入类型不包含这两个字段；因此排班的写入统一走 $queryRawUnsafe
 *   原生 SQL，并用 RETURNING 把列名 alias 成 camelCase 返回。
 */
@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 分页查询员工列表。
   */
  async listStaff(pagination: PaginationDto): Promise<PaginatedResult<Staff>> {
    const { page, page_size, keyword } = pagination;
    const skip = (page - 1) * page_size;
    const where = keyword
      ? { name: { contains: keyword, mode: 'insensitive' as const } }
      : undefined;

    const [list, total] = await Promise.all([
      this.prisma.staff.findMany({
        where,
        skip,
        take: page_size,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.staff.count({ where }),
    ]);

    return { list, total, page, page_size };
  }

  /**
   * 获取单个员工详情。
   */
  async getStaff(id: string): Promise<Staff> {
    const staff = await this.prisma.staff.findUnique({ where: { id } });
    if (!staff) {
      throw new NotFoundException(`员工不存在: ${id}`);
    }
    return staff;
  }

  /**
   * 创建员工。
   *
   * password 用 bcrypt 10 轮哈希为 passwordHash；username 冲突抛 409。
   */
  async createStaff(data: CreateStaffDto): Promise<Staff> {
    const existing = await this.prisma.staff.findUnique({
      where: { username: data.username },
    });
    if (existing) {
      throw new ConflictException(`用户名已存在: ${data.username}`);
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const { password, ...rest } = data;

    return this.prisma.staff.create({
      data: { ...rest, passwordHash },
    });
  }

  /**
   * 更新员工。
   *
   * - password 提供时才重新生成 passwordHash。
   * - username 变更需校验唯一性。
   */
  async updateStaff(id: string, data: UpdateStaffDto): Promise<Staff> {
    await this.getStaff(id);

    if (data.username) {
      const existing = await this.prisma.staff.findUnique({
        where: { username: data.username },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`用户名已存在: ${data.username}`);
      }
    }

    const { password, ...rest } = data;
    const passwordHash = password
      ? await bcrypt.hash(password, 10)
      : undefined;

    return this.prisma.staff.update({
      where: { id },
      data: { ...rest, ...(passwordHash ? { passwordHash } : {}) },
    });
  }

  /**
   * 删除员工。
   */
  async deleteStaff(id: string): Promise<Staff> {
    await this.getStaff(id);
    return this.prisma.staff.delete({ where: { id } });
  }

  // ---------- Schedule 排班 ----------

  /**
   * 查询某员工的全部排班。
   *
   * start_time / end_time 为 Unsupported 字段，运行时由 Prisma 返回，
   * 类型上不声明，消费方按需 cast。
   */
  async listSchedules(staffId: string): Promise<StaffSchedule[]> {
    return this.prisma.staffSchedule.findMany({
      where: { staffId },
      orderBy: [{ weekday: 'asc' }],
    });
  }

  /**
   * 获取单条排班。
   */
  async getSchedule(id: string): Promise<StaffSchedule> {
    const schedule = await this.prisma.staffSchedule.findUnique({
      where: { id },
    });
    if (!schedule) {
      throw new NotFoundException(`排班不存在: ${id}`);
    }
    return schedule;
  }

  /**
   * 创建排班（原生 SQL：因 start_time/end_time 为 Unsupported，无 create 方法）。
   */
  async createSchedule(
    staffId: string,
    data: CreateScheduleDto,
  ): Promise<StaffSchedule> {
    const rows = await this.prisma.$queryRawUnsafe<StaffSchedule[]>(
      `INSERT INTO staff_schedule
         (staff_id, weekday, start_time, end_time, effective_from, effective_to)
       VALUES ($1::uuid, $2, $3::time, $4::time, $5::date, $6::date)
       RETURNING id,
                 staff_id AS "staffId",
                 weekday,
                 start_time AS "startTime",
                 end_time AS "endTime",
                 effective_from AS "effectiveFrom",
                 effective_to AS "effectiveTo"`,
      staffId,
      data.weekday,
      data.startTime,
      data.endTime,
      data.effectiveFrom,
      data.effectiveTo ?? null,
    );
    return rows[0];
  }

  /**
   * 更新排班（原生 SQL：动态 SET 仅包含传入字段）。
   */
  async updateSchedule(
    id: string,
    data: UpdateScheduleDto,
  ): Promise<StaffSchedule> {
    await this.getSchedule(id);

    const columnMap: Record<string, { col: string; cast: string }> = {
      weekday: { col: 'weekday', cast: '' },
      startTime: { col: 'start_time', cast: '::time' },
      endTime: { col: 'end_time', cast: '::time' },
      effectiveFrom: { col: 'effective_from', cast: '::date' },
      effectiveTo: { col: 'effective_to', cast: '::date' },
    };

    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      const mapped = columnMap[key];
      if (!mapped) continue;
      sets.push(`${mapped.col} = $${idx}${mapped.cast}`);
      values.push(value);
      idx++;
    }

    if (sets.length === 0) {
      return this.getSchedule(id);
    }

    values.push(id);
    const sql =
      `UPDATE staff_schedule SET ${sets.join(', ')} ` +
      `WHERE id = $${idx}::uuid ` +
      `RETURNING id, staff_id AS "staffId", weekday, ` +
      `start_time AS "startTime", end_time AS "endTime", ` +
      `effective_from AS "effectiveFrom", effective_to AS "effectiveTo"`;

    const rows = await this.prisma.$queryRawUnsafe<StaffSchedule[]>(sql, ...values);
    return rows[0];
  }

  /**
   * 删除排班。
   */
  async deleteSchedule(id: string): Promise<StaffSchedule> {
    await this.getSchedule(id);
    return this.prisma.staffSchedule.delete({ where: { id } });
  }
}