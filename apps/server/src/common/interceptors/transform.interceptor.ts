import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Response } from 'express';

/**
 * 统一成功响应格式。
 *
 * {
 *   code: number,     // HTTP 状态码（成功默认 200）
 *   data: unknown,    // 控制器返回的业务数据
 *   message: string   // 默认 'success'
 * }
 *
 * 仅对 HTTP 上下文生效；对 null/undefined data 也包一层，保证前端契约稳定。
 */
export interface ApiResponse<T = unknown> {
  code: number;
  data: T;
  message: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const res = ctx.getResponse<Response>();
    return next.handle().pipe(
      map((data) => ({
        code: res.statusCode ?? 200,
        data: data as T,
        message: 'success',
      })),
    );
  }
}
