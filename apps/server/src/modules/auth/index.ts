/**
 * Auth 模块 barrel：对外只暴露"通过 service 接口调用"必要的类型，
 * guards 与 strategies 通过全局 APP_GUARD 自动生效，不需要消费者直接 import。
 */
export { AuthModule } from './auth.module';
export { AuthController } from './auth.controller';
export { AuthService } from './auth.service';

export * from './decorators';
export * from './guards';
export * from './ports';
export * from './types';
export * from './dto';
