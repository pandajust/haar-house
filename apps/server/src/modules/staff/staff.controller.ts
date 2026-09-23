import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { paginationSchema, type PaginationDto } from '@/common/dto';

import { Roles } from '../auth/decorators';
import { StaffService } from './staff.service';
import {
  createStaffSchema,
  updateStaffSchema,
  type CreateStaffDto,
  type UpdateStaffDto,
} from './dto/staff.dto';
import {
  createScheduleSchema,
  updateScheduleSchema,
  type CreateScheduleDto,
  type UpdateScheduleDto,
} from './dto/schedule.dto';

/**
 * 员工与排班控制器。
 *
 * 路由（全局前缀 /api 叠加）：
 *  - GET    /staff
 *  - GET    /staff/:id
 *  - POST   /staff
 *  - PUT    /staff/:id
 *  - DELETE /staff/:id
 *  - GET    /staff/:id/schedules
 *  - POST   /staff/:id/schedules
 *  - PUT    /schedules/:id
 *  - DELETE /schedules/:id
 *
 * 由于排班的更新/删除挂在 /schedules 根路径下，
 * 此处使用无 controller 前缀、方法上写完整路径的方式实现。
 */
@ApiTags('staff')
@ApiBearerAuth('access-token')
@Controller()
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get('staff')
  @Roles('owner', 'manager')
  @ApiOperation({ summary: '员工列表', description: '分页查询员工列表' })
  async listStaff(
    @Query(new ZodValidationPipe(paginationSchema)) query: PaginationDto,
  ) {
    return this.staffService.listStaff(query);
  }

  @Get('staff/:id')
  @ApiOperation({ summary: '员工详情' })
  async getStaff(@Param('id') id: string) {
    return this.staffService.getStaff(id);
  }

  @Post('staff')
  @Roles('owner')
  @ApiOperation({ summary: '创建员工' })
  async createStaff(
    @Body(new ZodValidationPipe(createStaffSchema)) dto: CreateStaffDto,
  ) {
    return this.staffService.createStaff(dto);
  }

  @Put('staff/:id')
  @Roles('owner', 'manager')
  @ApiOperation({ summary: '更新员工' })
  async updateStaff(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateStaffSchema)) dto: UpdateStaffDto,
  ) {
    return this.staffService.updateStaff(id, dto);
  }

  @Delete('staff/:id')
  @Roles('owner')
  @ApiOperation({ summary: '删除员工' })
  async deleteStaff(@Param('id') id: string) {
    return this.staffService.deleteStaff(id);
  }

  // ---------- Schedule 排班 ----------

  @Get('staff/:id/schedules')
  @ApiOperation({ summary: '员工排班列表' })
  async listSchedules(@Param('id') id: string) {
    return this.staffService.listSchedules(id);
  }

  @Post('staff/:id/schedules')
  @Roles('owner', 'manager')
  @ApiOperation({ summary: '创建排班' })
  async createSchedule(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createScheduleSchema)) dto: CreateScheduleDto,
  ) {
    return this.staffService.createSchedule(id, dto);
  }

  @Put('schedules/:id')
  @Roles('owner', 'manager')
  @ApiOperation({ summary: '更新排班' })
  async updateSchedule(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateScheduleSchema)) dto: UpdateScheduleDto,
  ) {
    return this.staffService.updateSchedule(id, dto);
  }

  @Delete('schedules/:id')
  @Roles('owner', 'manager')
  @ApiOperation({ summary: '删除排班' })
  async deleteSchedule(@Param('id') id: string) {
    return this.staffService.deleteSchedule(id);
  }
}