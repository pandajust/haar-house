import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';

import type {
  AuthenticatedUser,
  JwtPayload,
} from '../types/auth-payload.type';

/**
 * Refresh token 解析策略：从 request.body.refresh_token 抽取，
 * 用同一个 JWT_SECRET 校验签名与过期。
 *
 * 当前实现：
 *  - /auth/refresh 路由是 @Public，由 service 自行 verifyAsync(refresh_token) 完成校验
 *  - 本策略类保留供未来在路由级 @UseGuards(AuthGuard('jwt-refresh')) 场景复用，
 *    例如外部模块暴露"仅 refresh token 可访问"的端点时可直接挂载
 *
 * 防御：拒绝把 access token 当 refresh token 使用（payload.type !== 'refresh'）。
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(config: ConfigService) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET 未配置，无法初始化 JwtRefreshStrategy');
    }
    super({
      // 从 body.refresh_token 抽取；如缺则降级读 Authorization 头（兼容性）
      // passport-jwt 的 JwtFromRequestFunction 要求返回 string | null
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request | undefined) =>
          (req?.body as { refresh_token?: string } | undefined)
            ?.refresh_token ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('非 refresh token，禁止用于刷新');
    }
    return {
      id: payload.sub,
      kind: payload.kind,
      role: payload.role,
      username: payload.username,
      openid: payload.openid,
    };
  }
}
