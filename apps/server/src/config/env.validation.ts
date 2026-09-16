import { z } from 'zod';

/**
 * 环境变量 Zod schema。
 *
 * 用于 @nestjs/config 的 validate 回调：
 *   - 必填字段缺失会在启动时直接抛错
 *   - PORT 等通过 coerce 接受字符串并转为数字
 *   - 默认值在缺失时填充
 *
 * 注意：与 class-validator 的 whitelist/forbidNonWhitelisted 等价的语义
 *       在 DTO 层（zod-validation.pipe.ts 的 strictObject），这里只校验环境变量。
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(3000),
  LOG_LEVEL: z.string().optional(),
  CORS_ORIGINS: z.string().optional(),

  DATABASE_URL: z
    .string()
    .url()
    .refine((v) => v.startsWith('postgresql://') || v.startsWith('postgres://'), {
      message: 'DATABASE_URL 必须是 postgresql:// 或 postgres:// 开头',
    }),

  REDIS_URL: z
    .string()
    .url()
    .refine((v) => v.startsWith('redis://') || v.startsWith('rediss://'), {
      message: 'REDIS_URL 必须是 redis:// 或 rediss:// 开头',
    })
    .optional()
    .or(z.literal('').transform(() => undefined)),

  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET 至少 32 位')
    .max(256, 'JWT_SECRET 过长'),
  JWT_EXPIRES_IN: z.string().default('2h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  WX_APPID: z.string().optional(),
  WX_SECRET: z.string().optional(),

  ALIYUN_OSS_REGION: z.string().optional(),
  ALIYUN_OSS_BUCKET: z.string().optional(),
  ALIYUN_OSS_ACCESS_KEY_ID: z.string().optional(),
  ALIYUN_OSS_ACCESS_KEY_SECRET: z.string().optional(),

  ALIYUN_SMS_SIGN_NAME: z.string().optional(),
  ALIYUN_SMS_ACCESS_KEY_ID: z.string().optional(),
  ALIYUN_SMS_ACCESS_KEY_SECRET: z.string().optional(),

  API_PREFIX: z.string().default('api'),
  SWAGGER_PREFIX: z.string().default('api/docs'),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * 给 @nestjs/config 的 validate 回调使用。
 * 失败时抛错，启动直接中断（fail-fast）。
 */
export function validateEnv(raw: Record<string, unknown>): EnvConfig {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error('[config] 环境变量校验失败:\n' + issues);
  }
  return parsed.data;
}
