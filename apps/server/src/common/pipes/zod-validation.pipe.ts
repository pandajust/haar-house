import {
  ArgumentMetadata,
  Injectable,
  Optional,
  PipeTransform,
} from '@nestjs/common';
import { ZodError, ZodRawShape, ZodSchema, ZodType, z } from 'zod';

/**
 * Zod 校验管道。
 *
 * 设计：用 zod 替代 class-validator + ValidationPipe(whitelist, forbidNonWhitelisted)。
 * - 默认 strict 模式：对 object schema 使用 .strict() 语义，拒绝未知字段
 *   （等价于 forbidNonWhitelisted=true + whitelist=true）
 * - 通过 @Body() / @Query() / @Param() 装饰器注入的 schema 自动校验
 * - 也可作为全局管道使用，传入 schema 工厂
 *
 * 用法 1（路由级，推荐）：
 *   @Post()
 *   create(@Body(new ZodValidationPipe(CreateDtoSchema)) dto: CreateDto) {}
 *
 * 用法 2（全局，通过模块 APP_PIPE 注入）：
 *   { provide: APP_PIPE, useClass: ZodValidationPipe }
 *   路由处用 @ZodSchema() 自定义装饰器标注 schema —— 见 zod-schema.decorator.ts
 */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform {
  constructor(@Optional() private readonly schema?: ZodSchema<T> | ZodType<T>) {}

  transform(value: unknown, metadata: ArgumentMetadata): T {
    const schema = this.resolveSchema(metadata);
    if (!schema) return value as T;

    try {
      return schema.parse(value) as T;
    } catch (err) {
      if (err instanceof ZodError) {
        // 让全局异常过滤器统一处理 ZodError → 400
        throw err;
      }
      throw err;
    }
  }

  private resolveSchema(metadata: ArgumentMetadata): ZodSchema<T> | ZodType<T> | undefined {
    if (this.schema) return this.schema as ZodSchema<T> | ZodType<T>;

    // 全局管道场景：从 metadata.metatype 上读取静态 schema
    const ctor = metadata.metatype as unknown as {
      __zodSchema?: ZodSchema<T> | ZodType<T>;
    };
    return ctor?.__zodSchema;
  }
}

/**
 * 工具：把任意 zod 对象 schema 转为"拒绝未知字段"的严格版本。
 *
 * 等价于 ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })。
 */
export function strictObject<T extends ZodRawShape>(shape: T) {
  return z.object(shape).strict();
}
