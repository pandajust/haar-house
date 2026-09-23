import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type {
  AuthenticatedUser,
  JwtPayload,
} from '../types/auth-payload.type';

/**
 * Access token 解析策略：从 Authorization: Bearer <token> 抽取，
 * 用 JWT_SECRET 校验签名与过期时间，再把 payload 投影成 AuthenticatedUser。
 *
 * 由全局 JwtAuthGuard（AuthGuard('jwt')）调用，校验成功后挂到 request.user。
 *
 * 防御：拒绝把 refresh token 当 access token 使用（payload.type === 'refresh'）。
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      // env.validation.ts 已保证启动期 JWT_SECRET 必填，这里再断言一遍防御性编程
      throw new Error('JWT_SECRET 未配置，无法初始化 JwtStrategy');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    // 不允许 refresh token 通过 Authorization 头当 access 用
    if (payload.type === 'refresh') {
      throw new UnauthorizedException('请使用 access token 而非 refresh token');
    }
    return {
      id: payload.sub,
      kind: payload.kind,
      role: payload.role,
      username: payload.username,
      openid: payload.openid,
      // name 字段在 access token 中不携带，client 端走 /auth/me 时由 service 反查补全
    };
  }
}
