import type { Role } from './role.type';

/**
 * JWT 主体类型：区分员工登录态与客户（小程序）登录态。
 *
 * - staff:  管理后台用户（owner/manager/stylist/assistant/admin）
 * - client: 微信小程序客户
 */
export type SubjectKind = 'staff' | 'client';

/**
 * JWT 载荷结构。
 *
 * 字段说明：
 *  - sub:      用户 id（staff.id 或 client.id）
 *  - kind:     主体类型
 *  - role:     角色（仅 staff 必填；client 留空）
 *  - username: 用户名（仅 staff）
 *  - openid:   微信 openid（仅 client）
 *  - type:     token 类型，'access' 或 'refresh'（区分 access 与 refresh，防止互换滥用）
 *  - iat/exp:  由 @nestjs/jwt 自动注入
 */
export interface JwtPayload {
  sub: string;
  kind: SubjectKind;
  role?: Role;
  username?: string;
  openid?: string;
  type?: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

/**
 * 鉴权后挂在 request.user 上的对象。
 * 由各 Passport strategy 的 validate 方法返回。
 */
export interface AuthenticatedUser {
  id: string;
  kind: SubjectKind;
  role?: Role;
  username?: string;
  openid?: string;
  name?: string;
}

/**
 * GET /auth/me 与 TokenResponse.user 字段统一的对外用户视图。
 */
export interface UserView {
  id: string;
  kind: SubjectKind;
  role?: Role;
  username?: string;
  openid?: string;
  name?: string;
}
