import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
import * as bcrypt from 'bcrypt';
import { firstValueFrom } from 'rxjs';

import {
  CLIENT_REPOSITORY,
  type ClientRecord,
  type ClientRepository,
} from './ports/client.repository';
import {
  STAFF_REPOSITORY,
  type StaffRecord,
  type StaffRepository,
} from './ports/staff.repository';
import type { LoginDto } from './dto/login.dto';
import type { WxLoginDto } from './dto/wx-login.dto';
import type { TokenResponseDto } from './dto/token-response.dto';
import type {
  AuthenticatedUser,
  JwtPayload,
  UserView,
} from './types/auth-payload.type';

/**
 * 微信 code2session 响应（仅取业务字段，省略 errcode/errmsg）。
 */
interface WxSessionResponse {
  openid?: string;
  session_key?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

/**
 * 鉴权业务服务：账密登录 + 微信小程序登录 + token 刷新 + 当前用户反查。
 *
 * 设计要点：
 *  - 不直接依赖 PrismaClient；通过 StaffRepository / ClientRepository 接口访问数据
 *    （依赖反转，由 ports/staff.repository.ts 与 ports/client.repository.ts 声明，
 *     当前为内存 stub，T10/T11 接入 Prisma 后只需替换 provider useClass）
 *  - access token 与 refresh token 都用同一个 JWT_SECRET 签发，
 *    靠 payload.type 字段区分（'access' | 'refresh'）
 *  - 微信 code2session 失败时，非 production 直接降级返回 mock openid，
 *    便于本地与 e2e 联调
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(STAFF_REPOSITORY) private readonly staffRepo: StaffRepository,
    @Inject(CLIENT_REPOSITORY) private readonly clientRepo: ClientRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly http: HttpService,
  ) {}

  /**
   * POST /auth/login：账密登录（管理后台）。
   */
  async login(dto: LoginDto): Promise<TokenResponseDto> {
    const staff = await this.staffRepo.findByUsername(dto.username);
    if (!staff) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    const ok = await bcrypt.compare(dto.password, staff.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    return this.signTokensForStaff(staff);
  }

  /**
   * POST /auth/wx-login：微信小程序登录。
   *
   * 流程：code → code2session → openid → find/create client → 签 JWT。
   */
  async wxLogin(dto: WxLoginDto): Promise<TokenResponseDto> {
    const openid = await this.resolveOpenid(dto.code);
    const client = await this.findOrCreateClient(openid);
    return this.signTokensForClient(client);
  }

  /**
   * POST /auth/refresh：用 refresh_token 换新的一对 token。
   */
  async refresh(refreshToken: string): Promise<TokenResponseDto> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException('refresh token 无效或已过期，请重新登录');
    }
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('非 refresh token，禁止用于刷新');
    }
    if (payload.kind === 'staff') {
      const staff = await this.staffRepo.findById(payload.sub);
      if (!staff) throw new UnauthorizedException('用户不存在或已删除');
      return this.signTokensForStaff(staff);
    }
    const client = await this.clientRepo.findById(payload.sub);
    if (!client) throw new UnauthorizedException('用户不存在或已删除');
    return this.signTokensForClient(client);
  }

  /**
   * GET /auth/me：当前登录用户反查。
   *
   * 仅 access token 携带 role/openid 等 minimal payload，name 等字段需反查仓储补全。
   */
  async getCurrentUser(user: AuthenticatedUser): Promise<UserView> {
    if (user.kind === 'staff') {
      const staff = await this.staffRepo.findById(user.id);
      if (!staff) throw new UnauthorizedException('用户不存在或已删除');
      return {
        id: staff.id,
        kind: 'staff',
        role: staff.role,
        username: staff.username,
        name: staff.name,
      };
    }
    const client = await this.clientRepo.findById(user.id);
    if (!client) throw new UnauthorizedException('用户不存在或已删除');
    return {
      id: client.id,
      kind: 'client',
      openid: client.openid,
      name: client.name,
    };
  }

  // ---------- 内部辅助 ----------

  /**
   * 调用微信 code2session，失败时降级 mock openid（dev/test 模式）。
   *
   * 降级策略：
   *  - production: 直接 401，要求前端重新 wx.login
   *  - 非 production: code === 'mock-code' → 'mock-openid'（与 stub client 匹配）
   *                  其它 code → 'mock-openid-<code>'（首次会自动 create 客户）
   */
  private async resolveOpenid(code: string): Promise<string> {
    const appid = this.config.get<string>('WX_APPID');
    const secret = this.config.get<string>('WX_SECRET');
    const nodeEnv = this.config.get<string>('NODE_ENV');

    // 缺关键配置 → 直接走 mock
    if (!appid || !secret || appid === 'your-mini-appid') {
      this.logger.warn('WX_APPID/WX_SECRET 未配置，dev 模式降级 mock openid');
      return code === 'mock-code' ? 'mock-openid' : `mock-openid-${code}`;
    }

    const url =
      `https://api.weixin.qq.com/sns/jscode2session` +
      `?appid=${encodeURIComponent(appid)}` +
      `&secret=${encodeURIComponent(secret)}` +
      `&js_code=${encodeURIComponent(code)}` +
      `&grant_type=authorization_code`;

    try {
      const resp = await firstValueFrom(this.http.get<WxSessionResponse>(url));
      if (resp.data.openid) return resp.data.openid;
      // 微信业务错误（errcode != 0）也走降级
      this.logger.warn(
        `微信 code2session 无 openid，errcode=${resp.data.errcode} errmsg=${resp.data.errmsg}`,
      );
    } catch (err) {
      this.logger.warn(
        `微信 code2session 调用失败，降级 mock：${(err as Error).message}`,
      );
    }

    if (nodeEnv === 'production') {
      throw new UnauthorizedException('微信登录失败，请稍后重试');
    }
    return code === 'mock-code' ? 'mock-openid' : `mock-openid-${code}`;
  }

  private async findOrCreateClient(openid: string): Promise<ClientRecord> {
    const existing = await this.clientRepo.findByOpenid(openid);
    if (existing) return existing;
    return this.clientRepo.create({
      openid,
      name: '微信用户',
    });
  }

  private async signTokensForStaff(
    staff: StaffRecord,
  ): Promise<TokenResponseDto> {
    const payload: JwtPayload = {
      sub: staff.id,
      kind: 'staff',
      role: staff.role,
      username: staff.username,
    };
    const user: UserView = {
      id: staff.id,
      kind: 'staff',
      role: staff.role,
      username: staff.username,
      name: staff.name,
    };
    return this.signTokens(payload, user);
  }

  private async signTokensForClient(
    client: ClientRecord,
  ): Promise<TokenResponseDto> {
    const payload: JwtPayload = {
      sub: client.id,
      kind: 'client',
      openid: client.openid,
      // 客户登录态不带 staff 角色（role 留空），访问 @Roles 端点会被 RolesGuard 403
    };
    const user: UserView = {
      id: client.id,
      kind: 'client',
      openid: client.openid,
      name: client.name,
    };
    return this.signTokens(payload, user);
  }

  private async signTokens(
    payload: JwtPayload,
    user: UserView,
  ): Promise<TokenResponseDto> {
    const accessExpiresIn = this.config.get<string>('JWT_EXPIRES_IN') ?? '2h';
    const refreshExpiresIn =
      this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';

    // access token：不带 type 字段（payload.type === undefined）
    // 注意：@nestjs/jwt 的 expiresIn 接受 '2h' / '7d' / 数字秒数，
    // 但其类型升级后要求 vercel/ms 的 StringValue。dev/test 期用类型断言绕开。
    const access_token = await this.jwtService.signAsync(payload, {
      expiresIn: accessExpiresIn as unknown as number,
    });
    // refresh token：显式带 type='refresh'，并独立使用更长的过期时间
    const refresh_token = await this.jwtService.signAsync(
      { ...payload, type: 'refresh' as const },
      { expiresIn: refreshExpiresIn as unknown as number },
    );

    return {
      access_token,
      refresh_token,
      user,
    };
  }
}
