import { SetMetadata } from '@nestjs/common';

import type { Role } from '../types/role.type';

/**
 * 用于声明路由所需的最小角色集合，由全局 RolesGuard 读取并校验。
 *
 * 用法：
 *   @Roles('owner')
 *   @Get('admin-only')
 *   adminOnly() {}
 *
 * 多角色或语义：
 *   @Roles('owner', 'manager')  // owner 或 manager 之一即可通过
 *
 * 未标注 @Roles 的路由，RolesGuard 视为不限制（放行），
 * 由全局 JwtAuthGuard 负责登录态校验。
 */
export const ROLES_KEY = 'roles';

export const Roles =
  (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
