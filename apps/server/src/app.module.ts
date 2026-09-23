import { Module } from '@nestjs/common';
import {
  APP_FILTER,
  APP_GUARD,
  APP_INTERCEPTOR,
  APP_PIPE,
} from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor, TransformInterceptor } from './common/interceptors';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { loadDerivedConfig } from './config/configuration';
import { validateEnv } from './config/env.validation';
import { NotificationModule } from './modules/notification/notification.module';
import { ShopModule } from './modules/shop/shop.module';
import { StaffModule } from './modules/staff/staff.module';
import { ClientModule } from './modules/client/client.module';
import { AppointmentModule } from './modules/appointment/appointment.module';
import { OrderModule } from './modules/order/order.module';
import { MemberCardModule } from './modules/member-card/member-card.module';
import { PrismaModule } from './prisma';
import { RedisModule } from './redis';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: (env) => validateEnv(env as Record<string, unknown>),
      load: [loadDerivedConfig],
    }),
    PrismaModule,
    RedisModule,
    NotificationModule,
    AuthModule,
    ShopModule,
    StaffModule,
    ClientModule,
    AppointmentModule,
    OrderModule,
    MemberCardModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}