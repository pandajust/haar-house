import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';

import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';

import { Public } from '../auth/decorators/public.decorator';

import { AppointmentService } from './appointment.service';
import {
  createAppointmentSchema,
  CreateAppointmentDto,
  listAppointmentsQuerySchema,
  ListAppointmentsQueryDto,
  updateAppointmentSchema,
  UpdateAppointmentDto,
  updateStatusSchema,
  UpdateStatusDto,
} from './dto/appointment.dto';

/** 可预约时间段查询参数 schema */
const slotsQuerySchema = z.object({
  staffId: z.string().uuid('staffId 必须是合法 UUID'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date 格式应为 YYYY-MM-DD'),
});

/**
 * 预约控制器。
 *
 * 路由前缀 /appointments，全局前缀 /api 叠加后实际路径 /api/appointments。
 * 受全局 JwtAuthGuard 保护（需登录），slots 端点 @Public 豁免。
 */
@ApiTags('appointments')
@ApiBearerAuth('access-token')
@Controller('appointments')
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  /**
   * 预约列表。
   *
   * 支持 status / staffId / date 筛选 + 分页。
   */
  @Get()
  @ApiOperation({
    summary: '预约列表',
    description: '分页查询预约，支持 status / staffId / date 筛选',
  })
  async list(
    @Query(new ZodValidationPipe(listAppointmentsQuerySchema))
    query: ListAppointmentsQueryDto,
  ) {
    const { page, page_size, order, status, staffId, date } = query;
    return this.appointmentService.listAppointments(
      { page, page_size, order },
      { status, staffId, date },
    );
  }

  /**
   * 预约详情。
   */
  @Get(':id')
  @ApiOperation({ summary: '预约详情' })
  async get(@Param('id') id: string) {
    return this.appointmentService.getAppointment(id);
  }

  /**
   * 创建预约。
   *
   * 客户或员工均可创建。防重号由 service 层 Redis 锁 + DB unique 保证。
   */
  @Post()
  @ApiOperation({ summary: '创建预约' })
  async create(
    @Body(new ZodValidationPipe(createAppointmentSchema))
    dto: CreateAppointmentDto,
  ) {
    return this.appointmentService.createAppointment(dto);
  }

  /**
   * 更新预约基本信息。
   */
  @Put(':id')
  @ApiOperation({ summary: '更新预约' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateAppointmentSchema))
    dto: UpdateAppointmentDto,
  ) {
    return this.appointmentService.updateAppointment(id, dto);
  }

  /**
   * 取消预约（status → canceled）。
   */
  @Delete(':id')
  @ApiOperation({ summary: '取消预约' })
  async remove(@Param('id') id: string) {
    return this.appointmentService.cancelAppointment(id);
  }

  /**
   * 预约状态流转。
   *
   * 状态机校验由 service 层完成，非法转换 → 400。
   */
  @Patch(':id/status')
  @ApiOperation({
    summary: '更新预约状态',
    description:
      '状态机：pending→confirmed→in_service→done；任何状态→canceled；confirmed/in_service→no_show',
  })
  async updateStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateStatusSchema)) dto: UpdateStatusDto,
  ) {
    return this.appointmentService.updateStatus(id, dto.status);
  }

  /**
   * 查询某理发师某天可预约时间段（30 分钟粒度）。
   *
   * 公开接口，无需登录。
   */
  @Public()
  @Get('slots')
  @ApiOperation({
    summary: '可预约时间段',
    description: '基于排班 + 已有活跃预约计算 30 分钟可用时间槽',
  })
  async slots(
    @Query(new ZodValidationPipe(slotsQuerySchema))
    query: z.infer<typeof slotsQuerySchema>,
  ) {
    const slots = await this.appointmentService.getAvailableSlots(
      query.staffId,
      query.date,
    );
    return { slots };
  }
}