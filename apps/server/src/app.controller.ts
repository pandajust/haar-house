import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';

import { strictObject, ZodValidationPipe } from './common/pipes/zod-validation.pipe';

/**
 * 健康检查返回结构（TransformInterceptor 包装前的 data 字段）。
 */
export interface HealthData {
  status: 'ok';
  timestamp: string;
}

/**
 * Echo 校验 schema。strict 模式：拒绝未声明的额外字段。
 *
 * 等价于 ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })。
 */
export const echoSchema = strictObject({
  message: z.string().min(1).max(1024),
  echo: z.boolean().default(true),
});

export type EchoDto = z.infer<typeof echoSchema>;

/**
 * 根控制器。
 *
 * - GET /health：健康检查（被 setGlobalPrefix exclude 排除前缀）
 * - POST /api/echo：zod 严格校验示例
 */
@ApiTags('app')
@Controller()
export class AppController {
  @Get('health')
  @ApiOperation({ summary: '健康检查', description: '返回服务存活状态与时间戳' })
  health(): HealthData {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('echo')
  @HttpCode(200)
  @ApiOperation({ summary: 'Echo 示例', description: '演示 zod 严格校验：拒绝未知字段' })
  echo(@Body(new ZodValidationPipe(echoSchema)) dto: EchoDto): EchoDto {
    return dto;
  }
}
