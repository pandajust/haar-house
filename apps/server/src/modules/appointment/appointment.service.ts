import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PaginatedResult, PaginationDto } from '@/common/dto';
import { PrismaService } from '@/prisma';
import { RedisService } from '@/redis';

import {
  CreateAppointmentDto,
  UpdateAppointmentDto,
} from './dto/appointment.dto';
import type { Appointment } from './entities/appointment.entity';

/** 活跃预约状态：占用时间槽 */
const ACTIVE_STATUSES: Appointment['status'][] = [
  'pending',
  'confirmed',
  'in_service',
];

/** 预约状态机：当前状态 → 允许的下一状态集合 */
const STATUS_TRANSITIONS: Record<
  Appointment['status'],
  readonly Appointment['status'][]
> = {
  pending: ['confirmed', 'canceled'],
  confirmed: ['in_service', 'canceled', 'no_show'],
  in_service: ['done', 'canceled', 'no_show'],
  done: ['canceled'],
  canceled: [],
  no_show: [],
};

/**
 * 预约服务。
 *
 * 核心能力：
 *  - 预约 CRUD + 状态机流转
 *  - 防重号：Redis 分布式锁（key=appt:lock:{staffId}:{startTime}）+ DB @@unique 双重保险
 *  - 可预约时间段查询：基于 staff 排班 + 已有活跃预约计算 30 分钟可用槽
 */
@Injectable()
export class AppointmentService {
  private readonly logger = new Logger(AppointmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * 预约列表。
   *
   * filters:
   *  - status: 按状态筛选
   *  - staffId: 按理发师筛选
   *  - date:  按当天 startTime 筛选（00:00:00 ~ 23:59:59.999）
   */
  async listAppointments(
    pagination: PaginationDto,
    filters: { status?: string; staffId?: string; date?: string },
  ): Promise<PaginatedResult<Appointment>> {
    const { page, page_size } = pagination;
    const skip = (page - 1) * page_size;

    const where: Prisma.AppointmentWhereInput = {};
    if (filters.status) {
      where.status = filters.status as Appointment['status'];
    }
    if (filters.staffId) {
      where.staffId = filters.staffId;
    }
    if (filters.date) {
      const dayStart = new Date(`${filters.date}T00:00:00.000Z`);
      const dayEnd = new Date(`${filters.date}T23:59:59.999Z`);
      where.startTime = { gte: dayStart, lte: dayEnd };
    }

    const [list, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        skip,
        take: page_size,
        orderBy: { startTime: 'asc' },
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return { list, total, page, page_size };
  }

  /**
   * 获取单个预约详情。
   */
  async getAppointment(id: string): Promise<Appointment> {
    const appt = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appt) {
      throw new NotFoundException(`预约不存在: ${id}`);
    }
    return appt;
  }

  /**
   * 创建预约。
   *
   * 流程：
   *  1. 校验 staff / service 存在
   *  2. Redis 分布式锁（key=appt:lock:{staffId}:{startTime}，ttl=5000ms）
   *     - 锁被占用 → 该时段正在被预约，抛 ConflictException
   *     - Redis 不可用 → 降级仅靠 DB unique 约束（catch 后继续）
   *  3. 检查同 staffId + startTime 是否已存在活跃预约 → ConflictException
   *  4. 创建预约（status=pending）
   *  5. 释放锁（finally）
   *  6. DB unique 冲突（P2002）→ ConflictException
   */
  async createAppointment(data: CreateAppointmentDto): Promise<Appointment> {
    // 1. 校验 staff 和 service 存在
    const [staff, service] = await Promise.all([
      this.prisma.staff.findUnique({ where: { id: data.staffId } }),
      this.prisma.service.findUnique({ where: { id: data.serviceId } }),
    ]);
    if (!staff) {
      throw new NotFoundException(`理发师不存在: ${data.staffId}`);
    }
    if (!service) {
      throw new NotFoundException(`服务不存在: ${data.serviceId}`);
    }

    const lockKey = `appt:lock:${data.staffId}:${data.startTime.toISOString()}`;
    let lockToken: string | undefined;

    // 2. Redis 分布式锁
    try {
      const res = await this.redis.lock(lockKey, 5000);
      if (!res.ok) {
        throw new ConflictException('该时段正在被预约，请稍后重试');
      }
      lockToken = res.token;
    } catch (err) {
      // ConflictException 直接抛出；Redis 连接异常则降级
      if (err instanceof ConflictException) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Redis 锁获取失败，降级仅靠 DB unique 约束: ${msg}`,
      );
    }

    try {
      // 3. 检查同 staffId + startTime 是否已存在活跃预约
      const existing = await this.prisma.appointment.findFirst({
        where: {
          staffId: data.staffId,
          startTime: data.startTime,
          status: { in: ACTIVE_STATUSES },
        },
      });
      if (existing) {
        throw new ConflictException('该时段已有预约');
      }

      // 4. 创建预约
      const appt = await this.prisma.appointment.create({
        data: {
          clientId: data.clientId,
          staffId: data.staffId,
          serviceId: data.serviceId,
          startTime: data.startTime,
          durationMin: data.durationMin,
          status: 'pending',
          source: data.source,
          note: data.note,
        },
      });
      this.logger.log(`预约已创建: ${appt.id}`);
      return appt;
    } catch (err) {
      // DB unique 约束冲突兜底
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('该时段已有预约');
      }
      throw err;
    } finally {
      // 5. 释放锁
      if (lockToken) {
        try {
          await this.redis.unlock(lockKey, lockToken);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Redis 锁释放失败（锁会自动过期）: ${msg}`);
        }
      }
    }
  }

  /**
   * 更新预约基本信息。
   *
   * 不修改状态（状态走 updateStatus）。
   */
  async updateAppointment(
    id: string,
    data: UpdateAppointmentDto,
  ): Promise<Appointment> {
    await this.getAppointment(id);

    const appt = await this.prisma.appointment.update({
      where: { id },
      data: {
        clientId: data.clientId,
        staffId: data.staffId,
        serviceId: data.serviceId,
        startTime: data.startTime,
        durationMin: data.durationMin,
        source: data.source,
        note: data.note,
      },
    });
    this.logger.log(`预约已更新: ${id}`);
    return appt;
  }

  /**
   * 取消预约（status → canceled）。
   *
   * 任何状态均可取消。
   */
  async cancelAppointment(id: string): Promise<Appointment> {
    const appt = await this.getAppointment(id);
    if (appt.status === 'canceled') {
      throw new BadRequestException('预约已取消，无需重复操作');
    }
    return this.updateStatus(id, 'canceled');
  }

  /**
   * 状态机流转。
   *
   * 规则：
   *   pending → confirmed → in_service → done
   *   任何状态 → canceled
   *   confirmed / in_service → no_show
   *
   * 非法转换抛 BadRequestException。
   */
  async updateStatus(
    id: string,
    status: Appointment['status'],
  ): Promise<Appointment> {
    const appt = await this.getAppointment(id);

    const allowed = STATUS_TRANSITIONS[appt.status];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `非法状态转换: ${appt.status} → ${status}（允许: ${allowed.join(', ') || '无'}）`,
      );
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { status },
    });
    this.logger.log(`预约状态变更: ${id} ${appt.status} → ${status}`);
    return updated;
  }

  /**
   * 查询某理发师某天的可预约时间段（30 分钟粒度）。
   *
   * 逻辑：
   *  1. 取该 staff 在该日期对应 weekday 的排班（effective_from <= date <= effective_to）
   *  2. 取该 staff 当天所有活跃预约（pending/confirmed/in_service）
   *  3. 从排班开始到结束，每 30 分钟生成一个时间槽
   *  4. 过滤掉与活跃预约重叠的时间槽
   *
   * 返回 ISO 字符串数组（每个槽的起始时间）。
   */
  async getAvailableSlots(
    staffId: string,
    date: string,
  ): Promise<string[]> {
    const targetDate = new Date(`${date}T00:00:00.000Z`);
    // JS getDay: 0=周日 ... 6=周六，与 schema weekday 一致
    const weekday = targetDate.getUTCDay();

    // 1. 取排班
    const schedule = await this.prisma.staffSchedule.findFirst({
      where: {
        staffId,
        weekday,
        effectiveFrom: { lte: targetDate },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: targetDate } },
        ],
      },
    });
    if (!schedule) {
      return [];
    }

    // startTime / endTime 是 PostgreSQL time 类型（Prisma Unsupported），
    // 运行时返回字符串如 "09:00:00"，需 cast 访问
    const { startTime, endTime } = schedule as unknown as {
      startTime: string;
      endTime: string;
    };
    const startStr = String(startTime);
    const endStr = String(endTime);
    const [sh, sm] = startStr.split(':').map(Number);
    const [eh, em] = endStr.split(':').map(Number);

    const dayStart = Date.UTC(
      targetDate.getUTCFullYear(),
      targetDate.getUTCMonth(),
      targetDate.getUTCDate(),
      sh,
      sm,
      0,
      0,
    );
    const dayEnd = Date.UTC(
      targetDate.getUTCFullYear(),
      targetDate.getUTCMonth(),
      targetDate.getUTCDate(),
      eh,
      em,
      0,
      0,
    );

    // 2. 取当天活跃预约
    const dayBegin = new Date(`${date}T00:00:00.000Z`);
    const dayFinish = new Date(`${date}T23:59:59.999Z`);
    const appointments = await this.prisma.appointment.findMany({
      where: {
        staffId,
        startTime: { gte: dayBegin, lte: dayFinish },
        status: { in: ACTIVE_STATUSES },
      },
      select: { startTime: true, durationMin: true },
    });

    // 3. 生成 30 分钟槽并过滤
    const SLOT_MS = 30 * 60 * 1000;
    const slots: string[] = [];

    for (let t = dayStart; t < dayEnd; t += SLOT_MS) {
      const slotStart = t;
      const slotEnd = t + SLOT_MS;

      // 4. 检查是否与活跃预约重叠
      const overlapped = appointments.some((a) => {
        const apptStart = a.startTime.getTime();
        const apptEnd = apptStart + a.durationMin * 60 * 1000;
        // 重叠条件：apptStart < slotEnd && apptEnd > slotStart
        return apptStart < slotEnd && apptEnd > slotStart;
      });

      if (!overlapped) {
        slots.push(new Date(slotStart).toISOString());
      }
    }

    return slots;
  }
}