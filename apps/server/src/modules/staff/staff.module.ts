import { Module } from '@nestjs/common';

import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';

/**
 * 员工模块：员工档案与排班 CRUD。
 *
 * PrismaService 由全局 PrismaModule 提供，无需在此 import。
 */
@Module({
  controllers: [StaffController],
  providers: [StaffService],
})
export class StaffModule {}