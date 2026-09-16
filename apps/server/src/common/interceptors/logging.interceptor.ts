import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';

/**
 * 请求日志拦截器。
 *
 * 记录：method、url、耗时 ms、status。
 * 错误响应也会被记录（异常过滤器在前，但 tap 仍能拿到最终 statusCode）。
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const startedAt = Date.now();
    const { method, url } = req;

    return next.handle().pipe(
      tap({
        next: () => {
          const elapsed = Date.now() - startedAt;
          this.logger.log(`${method} ${url} ${res.statusCode} ${elapsed}ms`);
        },
        error: (err) => {
          const elapsed = Date.now() - startedAt;
          this.logger.warn(
            `${method} ${url} ERROR ${elapsed}ms ${err?.name ?? 'Error'}: ${err?.message ?? err}`,
          );
        },
      }),
    );
  }
}
