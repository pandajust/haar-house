import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { AuthenticatedUser } from '../types/auth-payload.type';

/**
 * 参数装饰器：取出当前登录用户。
 *
 * 依赖全局 JwtAuthGuard / PassportStrategy 已把 user 挂到 request.user。
 *
 * 用法：
 *   @Get('me')
 *   @ApiOperation({ summary: '当前用户' })
 *   me(@CurrentUser() user: AuthenticatedUser) {
 *     return user;
 *   }
 *
 *   // 也可只取某个字段
 *   me(@CurrentUser('id') id: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
    }>();
    const user = request.user;
    if (!user) return undefined;
    if (data) return user[data];
    return user;
  },
);
