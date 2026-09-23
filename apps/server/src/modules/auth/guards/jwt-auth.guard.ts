import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * 全局 JWT 守卫。
 *
 * 行为：
 *  - 路由被 @Public() 装饰 → 直接放行
 *  - 否则调用 PassportStrategy('jwt') 校验 Authorization: Bearer <token>
 *  - 校验失败（无 token / 过期 / 签名错）→ 401 UnauthorizedException
 *  - 校验成功 → request.user 被填充，继续走 RolesGuard
 *
 * 注册方式：
 *   { provide: APP_GUARD, useClass: JwtAuthGuard }   // 写在 AppModule.providers
 *
 * 与 RolesGuard 的顺序：JwtAuthGuard 在前（先解析 user），RolesGuard 在后（按 role 判定）。
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    // AuthGuard 的默认策略名是 'jwt'，与 JwtStrategy 第二个参数一致
    super();
  }

  canActivate(context: ExecutionContext) {
    // 1. 检查 @Public() 标记
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // 2. 走 passport-jwt 流程
    return super.canActivate(context);
  }

  /**
   * 失败处理：把 passport 抛出的 401 统一成 NestJS 的 UnauthorizedException，
   * 由全局 HttpExceptionFilter 包成 {code, message, details, timestamp} 格式。
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleRequest(err: any, user: any): any {
    if (err || !user) {
      throw new UnauthorizedException(
        '未授权访问，请先登录或在 Authorization 头携带 Bearer token',
      );
    }
    return user;
  }
}
