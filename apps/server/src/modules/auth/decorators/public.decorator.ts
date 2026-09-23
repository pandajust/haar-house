import { SetMetadata } from '@nestjs/common';

/**
 * 用于标记路由为"公开访问"，豁免全局 JwtAuthGuard。
 *
 * 典型用法：
 *   @Public()
 *   @Post('login')
 *   login(...) {}
 *
 * 全局守卫 JwtAuthGuard.canActivate 会先读取此 metadata，
 * 若为 true 则直接放行，不校验 Authorization 头。
 */
export const IS_PUBLIC_KEY = 'isPublic';

export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_PUBLIC_KEY, true);
