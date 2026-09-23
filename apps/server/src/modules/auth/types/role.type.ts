/**
 * 员工角色枚举。
 *
 * - owner:     店主（最高权限）
 * - manager:   店长
 * - stylist:   理发师
 * - assistant: 助理
 * - admin:     系统管理员（多店管理员，单店场景默认不开放）
 *
 * 客户（client）登录态不在此枚举内，JwtPayload.role 留空。
 */
export type Role = 'owner' | 'manager' | 'stylist' | 'assistant' | 'admin';

/**
 * 角色常量数组，便于守卫或测试枚举。
 */
export const ALL_ROLES: readonly Role[] = [
  'owner',
  'manager',
  'stylist',
  'assistant',
  'admin',
] as const;
