import { z } from 'zod';

import { strictObject } from '../pipes/zod-validation.pipe';

/**
 * 分页查询基础 DTO（query 参数）。
 *
 * 页码从 1 开始；page_size 范围 1..200。
 * strict 模式拒绝未声明的额外字段（如试图注入 SQL 列名）。
 */
export const paginationSchema = strictObject({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce
    .number()
    .int()
    .min(1)
    .max(200)
    .default(20),
  sort: z.string().max(64).optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
  keyword: z.string().max(64).optional(),
});

export type PaginationDto = z.infer<typeof paginationSchema>;

/**
 * 分页返回结构，service 层填充后由 TransformInterceptor 包成 {code,data,message}。
 */
export interface PaginatedResult<T> {
  list: T[];
  total: number;
  page: number;
  page_size: number;
}
