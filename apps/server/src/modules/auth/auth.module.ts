import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {
  CLIENT_REPOSITORY,
} from './ports/client.repository';
import { STAFF_REPOSITORY } from './ports/staff.repository';
import { PrismaClientRepository } from './repositories/prisma-client.repository';
import { PrismaStaffRepository } from './repositories/prisma-staff.repository';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

/**
 * 鉴权模块：登录、微信登录、刷新 token、当前用户、RBAC。
 *
 * STAFF_REPOSITORY / CLIENT_REPOSITORY 已替换为 Prisma 实现，
 * 直接查询 staff / client 表。
 */
@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (config.get<string>('JWT_EXPIRES_IN') ?? '2h') as unknown as number,
        },
      }),
    }),
    HttpModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtRefreshStrategy,
    { provide: STAFF_REPOSITORY, useClass: PrismaStaffRepository },
    { provide: CLIENT_REPOSITORY, useClass: PrismaClientRepository },
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}