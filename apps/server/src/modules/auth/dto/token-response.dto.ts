import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { Role } from '../types/role.type';
import type { SubjectKind } from '../types/auth-payload.type';

/**
 * 用户视图 DTO（/auth/me 与 login/wx-login/refresh 返回的 user 字段共用）。
 */
export class UserViewDto {
  @ApiProperty({ description: '用户 id' })
  id!: string;

  @ApiProperty({
    description: '主体类型：staff=员工，client=客户',
    enum: ['staff', 'client'],
  })
  kind!: SubjectKind;

  @ApiPropertyOptional({
    description: '角色（仅 staff 必填）',
    enum: ['owner', 'manager', 'stylist', 'assistant', 'admin'],
  })
  role?: Role;

  @ApiPropertyOptional({ description: '用户名（仅 staff）' })
  username?: string;

  @ApiPropertyOptional({ description: '微信 openid（仅 client）' })
  openid?: string;

  @ApiPropertyOptional({ description: '客户姓名（仅 client）' })
  name?: string;
}

/**
 * 登录/刷新 token 后的标准响应体。
 */
export class TokenResponseDto {
  @ApiProperty({ description: '访问令牌（短期，2h）', example: 'eyJhbGciOi...' })
  access_token!: string;

  @ApiProperty({ description: '刷新令牌（长期，7d）', example: 'eyJhbGciOi...' })
  refresh_token!: string;

  @ApiProperty({
    description: '当前登录用户视图',
    type: () => UserViewDto,
  })
  user!: UserViewDto;
}
