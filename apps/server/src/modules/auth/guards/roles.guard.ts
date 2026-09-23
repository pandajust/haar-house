import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ROLES_KEY } from '../decorators/roles.decorator';
import type { Role } from '../types/role.type';

/**
 * 全局 RBAC 守卫。
 *
 * 行为：
 *  - 路由未标注 @Roles() → 直接放行（不限制角色）
 *  - 路由标注 @Roles('owner', ...) → 当前 user.role 必须命中其一，否则 403
 *
 * 与 JwtAuthGuard 的顺序：
 *   APP_GUARD 先注册 JwtAuthGuard → 解析出 request.user
 *   APP_GUARD 再注册 RolesGuard  → 读取 request.user.role 做角色判断
 *
 * 注意：此守卫依赖 JwtAuthGuard 已填充 request.user；
 *       在 @Public() 路由上使用 @Roles() 没有意义（user 必为空 → 403）。
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<
      Role[] | undefined
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);

    // 未声明 @Roles → 不做角色限制
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<{
      user?: { role?: Role };
    }>();
    const user = request.user;

    if (!user || !user.role || !requiredRoles.includes(user.role)) {
      // 当前用户没有所需角色中的任何一个
      throw new ForbiddenException(
        `权限不足：当前角色无权访问，需要 ${requiredRoles.join(' / ')} 之一`,
      );
    }
    return true;
  }
}
