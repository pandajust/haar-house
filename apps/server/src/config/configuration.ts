import type { ConfigService } from '@nestjs/config';

import type { EnvConfig } from './env.validation';

/**
 * 派生配置：从校验后的环境变量派生出更易消费的结构。
 * 作为 @nestjs/config 的 load factory 注册。
 */
export function loadDerivedConfig() {
  return {
    app: {
      name: 'hair-salon-server',
      version: '0.1.0',
    },
    derived: {
      // 占位：后续可放业务相关派生配置
    },
  };
}

/**
 * 类型安全的 env 读取器。下游通过 injectEnv(configService) 拿到强类型 EnvConfig。
 *
 * 注意：@nestjs/config 的 validate 回调已保证 process.env 经过 zod 校验，
 * 这里只是做类型断言。运行期仍是 unknown → EnvConfig 的窄化。
 */
export function injectEnv(config: ConfigService): EnvConfig {
  return config as unknown as ConfigService<EnvConfig, true> as unknown as EnvConfig;
}
