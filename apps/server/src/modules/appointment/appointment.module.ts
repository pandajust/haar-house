import { Module } from '@nestjs/common';

import { AppointmentController } from './appointment.controller';
import { AppointmentService } from './appointment.service';

/**
 * 预约模块。
 *
 * 提供预约 CRUD、状态机流转、可预约时间段查询。
 * PrismaService / RedisService 均由 @Global 模块提供，无需在此 imports。
 */
@Module({
  controllers: [AppointmentController],
  providers: [AppointmentService],
  exports: [AppointmentService],
})
export class AppointmentModule {}