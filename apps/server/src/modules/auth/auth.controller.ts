import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';

import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import { loginSchema, type LoginDto } from './dto/login.dto';
import { refreshSchema, type RefreshDto } from './dto/refresh.dto';
import {
  type TokenResponseDto,
} from './dto/token-response.dto';
import { wxLoginSchema, type WxLoginDto } from './dto/wx-login.dto';
import type { AuthenticatedUser, UserView } from './types/auth-payload.type';

/**
 * 鉴权控制器：登录、微信登录、刷新、当前用户、RBAC 示例端点。
 *
 * 路由前缀 /auth，全局前缀 /api 叠加后实际路径为 /api/auth/xxx。
 *
 * Swagger BearerAuth 由 main.ts 的 .addBearerAuth(..., 'access-token') 注册，
 * 此处 @ApiBearerAuth('access-token') 用于标注需要 Bearer 的接口。
 */
@ApiTags('auth')
@ApiBearerAuth('access-token')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /**
   * 账密登录（管理后台）。@Public：豁免全局 JwtAuthGuard。
   */
  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: '账密登录',
    description: '员工账号密码登录，返回 access/refresh token 与用户视图',
  })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) dto: LoginDto,
  ): Promise<TokenResponseDto> {
    return this.auth.login(dto);
  }

  /**
   * 微信小程序登录。@Public：豁免全局 JwtAuthGuard。
   *
   * 入参 { code } 来自 wx.login()；后端调 code2session 拿 openid，再 find/create client。
   */
  @Public()
  @Post('wx-login')
  @HttpCode(200)
  @ApiOperation({
    summary: '微信小程序登录',
    description:
      'code → code2session → openid → find/create client → 签 JWT；dev 模式失败降级 mock openid',
  })
  async wxLogin(
    @Body(new ZodValidationPipe(wxLoginSchema)) dto: WxLoginDto,
  ): Promise<TokenResponseDto> {
    return this.auth.wxLogin(dto);
  }

  /**
   * 刷新 token。@Public：豁免全局 JwtAuthGuard（但要求 body 携带 refresh_token，
   * 由 service 内部 verifyAsync 校验）。
   */
  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({
    summary: '刷新 token',
    description: '用 refresh_token 换发新的一对 access/refresh token',
  })
  async refresh(
    @Body(new ZodValidationPipe(refreshSchema)) dto: RefreshDto,
  ): Promise<TokenResponseDto> {
    return this.auth.refresh(dto.refresh_token);
  }

  /**
   * 当前登录用户。受全局 JwtAuthGuard 保护：无 token → 401。
   */
  @Get('me')
  @ApiOperation({
    summary: '当前登录用户',
    description: '基于 Authorization Bearer token 反查当前用户视图',
  })
  async me(@CurrentUser() user: AuthenticatedUser): Promise<UserView> {
    return this.auth.getCurrentUser(user);
  }

  /**
   * 仅 owner 可访问的示例端点（用于演示 RBAC，e2e 测试中验证 403）。
   *
   * RolesGuard 读 @Roles('owner') 元数据 → 校验 request.user.role 是否命中。
   */
  @Get('admin-only')
  @Roles('owner')
  @ApiOperation({
    summary: '仅 owner 可访问（RBAC 示例）',
    description: '演示 @Roles 装饰器 + RolesGuard：非 owner 角色 → 403',
  })
  adminOnly(): { message: string } {
    return { message: '欢迎店主，这是仅 owner 可见的接口' };
  }
}
