import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ZodError } from 'zod';

/**
 * 统一错误响应格式。
 *
 * {
 *   code: number,        // HTTP 状态码或自定义业务码
 *   message: string,     // 人类可读的简要错误
 *   details?: unknown,   // 结构化错误细节（字段错误、堆栈等）
 *   timestamp: string    // ISO 时间戳，便于排查
 * }
 */
export interface ErrorResponse {
  code: number;
  message: string;
  details?: unknown;
  timestamp: string;
}

/**
 * 全局异常过滤器。
 *
 * 处理：
 *  - HttpException：取其 status 与 message，保留 response 中的结构化字段
 *  - ZodError：转 400，details 形如 { field: path, message }[]
 *  - 其它未知错误：500，message 统一为 "Internal server error"（生产环境不暴露堆栈）
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const body = this.buildBody(exception, request.url);
    const status = body.code;

    if (status >= 500) {
      this.logger.error(
        `[${request.method} ${request.url}] ${body.message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else if (status >= 400) {
      this.logger.warn(
        `[${request.method} ${request.url}] ${body.message} ${JSON.stringify(body.details ?? {})}`,
      );
    }

    if (!response.headersSent) {
      response.status(status).json(body);
    }
  }

  private buildBody(exception: unknown, url: string): ErrorResponse {
    const timestamp = new Date().toISOString();

    if (exception instanceof ZodError) {
      return {
        code: HttpStatus.BAD_REQUEST,
        message: '参数校验失败',
        details: exception.issues.map((i) => ({
          field: i.path.join('.') || '(root)',
          message: i.message,
        })),
        timestamp,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const resp = exception.getResponse();
      let message = exception.message;
      let details: unknown = undefined;

      if (typeof resp === 'string') {
        message = resp;
      } else if (resp && typeof resp === 'object') {
        const r = resp as Record<string, unknown>;
        message = typeof r.message === 'string' ? r.message : exception.message;
        if (r.error !== undefined) details = { error: r.error };
        if (r.details !== undefined) details = r.details;
        // class-validator 风格的 message 数组
        if (Array.isArray(r.message)) {
          details = { fields: r.message };
          message = '参数校验失败';
        }
      }
      return { code: status, message, details, timestamp };
    }

    if (exception instanceof Error) {
      this.logger.error(
        `未捕获异常 @ ${url}: ${exception.message}`,
        exception.stack,
      );
    }

    return {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      details: undefined,
      timestamp,
    };
  }
}
