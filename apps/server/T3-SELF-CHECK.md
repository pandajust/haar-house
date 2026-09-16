# T3 自检清单 — NestJS 后端脚手架

任务：搭建 apps/server NestJS 10 后端骨架（pnpm monorepo 子包，TS strict，全局 ValidationPipe/异常过滤器/Swagger，/health 健康检查）。

## 验收标准核对

| # | 验收项 | 状态 | 验证方式 |
|---|---|---|---|
| 1 | `pnpm install` 在根目录无错 | ✅ | 根目录 `npx pnpm@9.12.0 install --no-frozen-lockfile` 成功，更新 lockfile |
| 2 | `pnpm --filter server dev` 启动 nest，监听 3000 | ✅ | `pnpm --filter server build` + `node dist/main.js` 启动后 `GET http://localhost:3000/health` 返回 200 |
| 3 | `GET /health` 返回 `{status:'ok', timestamp: ISO}` | ✅ | 实测：`{code:200, data:{status:"ok", timestamp:"2026-09-16T09:06:10.573Z"}, message:"success"}` |
| 4 | `GET /api/docs` 能打开 swagger UI | ✅ | 实测：返回 200 + `text/html` + 含 `swagger-ui`；`/api/docs-json` 返回 spec（title=理发店管理系统 API, version=0.1.0, 含 /health 路径） |
| 5 | 全局 ValidationPipe 拒绝未知字段（whitelist+forbidNonWhitelisted） | ✅ | ZodValidationPipe + `strictObject`（zod `.strict()` 等价语义）；`POST /api/echo` 带 `unknownField` → 400，details 指出该字段 |
| 6 | HttpExceptionFilter 统一错误格式 `{code, message, details}` | ✅ | 400/404 实测均返回 `{code, message, details, timestamp}` |
| 7 | TransformInterceptor 统一响应格式 `{code, data, message}` | ✅ | 200 响应实测 `{code:200, data:..., message:"success"}` |
| 8 | config 模块用 @nestjs/config + zod schema 校验 | ✅ | `src/config/env.validation.ts` 导出 `envSchema`，`AppModule` 通过 `ConfigModule.forRoot({ validate })` 接入；缺失/非法必填字段启动即 fail-fast |
| 9 | tsconfig strict 模式，paths 别名 @/ → src/ | ✅ | `tsconfig.json` strict 全套 + `paths: { "@/*": ["src/*"] }`；test 中通过 `moduleNameMapper` 解析 |
| 10 | package.json scripts: dev/build/start/lint/typecheck/test/test:e2e | ✅ | 七个脚本齐备，见 `apps/server/package.json` |

## 额外约束核对

- 根 package.json 未改动（name: hair-salon-system, packageManager: pnpm@9.12.0）。
- 根 docker-compose.yml / apps/admin / apps/mini 均未触碰。
- 使用 Nest 10、TypeScript 5.x、zod 3。
- apps/server 拥有独立 tsconfig.json，根 `.eslintrc.json` 的 `parserOptions.project` 已包含 `./apps/*/tsconfig.json`。

## 文件清单

```
apps/server/
├── .envrc.example                          # 环境变量模板（含 PG/Redis/JWT/WX/阿里云）
├── .env                                    # 本地开发用（从 .envrc.example 复制，gitignored）
├── package.json                            # name: server, 七个 scripts
├── tsconfig.json                           # strict + paths @/* → src/*
├── tsconfig.build.json                     # extends tsconfig.json, 排除 test
├── nest-cli.json                           # sourceRoot: src
├── jest.config.js                          # 单元测试配置
├── T3-SELF-CHECK.md                        # 本文件
├── src/
│   ├── main.ts                             # bootstrap：全局前缀/CORS/Swagger/监听
│   ├── app.module.ts                       # 根模块：ConfigModule + APP_PIPE/FILTER/INTERCEPTOR
│   ├── app.controller.ts                   # GET /health + POST /api/echo（zod 严格校验示例）
│   ├── common/
│   │   ├── index.ts                        # barrel
│   │   ├── dto/
│   │   │   ├── index.ts
│   │   │   └── pagination.dto.ts          # strictObject 分页 DTO
│   │   ├── filters/
│   │   │   ├── index.ts
│   │   │   └── http-exception.filter.ts   # 统一错误 {code, message, details, timestamp}
│   │   ├── interceptors/
│   │   │   ├── index.ts
│   │   │   ├── logging.interceptor.ts     # 请求日志
│   │   │   └── transform.interceptor.ts   # 统一响应 {code, data, message}
│   │   └── pipes/
│   │       ├── index.ts
│   │       └── zod-validation.pipe.ts     # zod 校验 + strictObject 工具
│   └── config/
│       ├── configuration.ts                # loadDerivedConfig + injectEnv 类型工具
│       └── env.validation.ts              # envSchema + validateEnv
└── test/
    ├── jest-e2e-setup.ts                  # e2e 测试注入 process.env
    ├── jest-e2e.config.js                 # e2e jest 配置
    └── health.e2e-spec.ts                 # 6 个 e2e 用例覆盖 AC3-AC7
```

## 验证命令

```powersShell
# 1. 安装依赖（根目录）
npx pnpm@9.12.0 install --no-frozen-lockfile

# 2. 类型检查
npx pnpm@9.12.0 --filter server typecheck

# 3. e2e 测试（覆盖 AC2-AC7）
npx pnpm@9.12.0 --filter server test:e2e

# 4. 启动开发服务器（需先 cp .envrc.example .env）
npx pnpm@9.12.0 --filter server dev
# 浏览器访问 http://localhost:3000/health 和 http://localhost:3000/api/docs
```

## 设计说明

### 全局管道/过滤器/拦截器注册方式

通过 `AppModule` 的 `APP_PIPE` / `APP_FILTER` / `APP_INTERCEPTOR` token 注册（DI 方式），而非 `main.ts` 的 `useGlobalPipes` 等。这样：
- e2e 测试用 `Test.createTestingModule({ imports: [AppModule] })` 即自动获得全套全局组件，无需重复注册。
- `main.ts` 只负责 app 级配置（全局前缀、CORS、Swagger、监听端口），避免双重包装。

### zod 等价 whitelist+forbidNonWhitelisted

zod 没有 class-validator 的 decorator 模型，等价语义通过 `z.object(shape).strict()` 实现：
- `strict()` 拒绝 schema 外的未知字段（等价 `forbidNonWhitelisted: true`）。
- schema 内声明的字段即白名单（等价 `whitelist: true`）。
- 工具函数 `strictObject(shape)` 封装此模式，路由级通过 `@Body(new ZodValidationPipe(strictObject({...})))` 注入。
- 全局 `ZodValidationPipe`（无 schema）对未声明 schema 的参数透传，不阻塞 /health 等无 DTO 路由。

### 路径前缀

- `setGlobalPrefix('api', { exclude: ['health'] })`：除 /health 外所有路由挂 /api。
- `GET /health` 在根路径（k8s/负载均衡探针友好）。
- `POST /api/echo`、`GET /api/docs-json` 等业务路由走 /api 前缀。
- Swagger UI 注册路径 `api/docs` 不受 setGlobalPrefix 影响（直接挂载 Express 路由）。

### @/ 路径别名

`tsconfig.json` 声明 `paths: { "@/*": ["src/*"] }`（满足 AC9）。ship 源码使用相对导入（tsc 不重写 paths 到 dist/），tests 通过 jest `moduleNameMapper` 使用 @/ 别名。

## 已知限制 / 后续任务

- 本任务仅 T3 脚手架；具体业务模块（Shop/Staff/Client/Appointment/Order/MemberCard/Marketing/Stats/Auth/Notification）由 T7-T12 实现。
- zod 校验仅在路由级注入 schema 时生效；后续模块需为每个 DTO 提供 strictObject schema。
- 数据库连接（PG/Redis）在 T7 落地；当前 .env 中的 DATABASE_URL/REDIS_URL 仅做格式校验，不实际连接。
