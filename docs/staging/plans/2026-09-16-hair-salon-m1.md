# M1 计划：基础设施 + 核心交易闭环

spec: [docs/staging/specs/2026-09-16-hair-salon-system.md](file:///d:/smallapp/hair/docs/staging/specs/2026-09-16-hair-salon-system.md)
milestone: M1 (see docs/ROADMAP.md)

## Agent 分工总览

| Agent | 负责范围 |
|---|---|
| A 后端骨架 | T1, T3, T7, T8 |
| B 后端业务 | T9, T10, T11, T12, T15 |
| C 管理后台 | T4, T13 |
| D 小程序 | T5, T14 |
| E 基础设施 | T2, T6, T15(压测) |

## 任务清单

- [ ] T1: 仓库根目录初始化
  - goal: 建立 pnpm monorepo 与基础仓库文件
  - files: package.json, pnpm-workspace.yaml, .gitignore, README.md, CHANGELOG.md, Makefile, .editorconfig, .prettierrc, .eslintrc.cjs
  - acceptance: `pnpm install` 无错；`make lint` 通过；`make build` 能进入子包构建
  - spec: spec#架构

- [parallel] T2, T3, T4, T5, T6

- [ ] T2: 开发环境 docker-compose
  - goal: 一键起 PG + Redis 本地依赖
  - files: docker-compose.yml, .env.example, scripts/dev-up.sh
  - acceptance: `docker compose up -d` 后 `psql -h localhost -U hair -d hair` 能连，`redis-cli ping` 返回 PONG
  - spec: spec#架构

- [ ] T3: NestJS 后端脚手架
  - goal: 搭好后端骨架与全局中间件
  - files: apps/server/{src/main.ts, app.module.ts, common/{filters,pipes,interceptors}}, apps/server/package.json, tsconfig.json, nest-cli.json
  - acceptance: `pnpm --filter server dev` 启动；`GET /health` 返回 `{status:'ok'}`；全局 ValidationPipe、HttpExceptionFilter、swagger 文档可访问
  - spec: spec#模块化单体内部模块

- [ ] T4: 管理后台脚手架
  - goal: Vite + Ant Design Pro 5 后台骨架
  - files: apps/admin/{package.json, vite.config.ts, src/main.tsx, src/App.tsx, src/layouts/, src/utils/request.ts, src/router/, src/locales/}
  - acceptance: `pnpm --filter admin dev` 启动；登录页骨架可访问；axios 拦截器附 JWT；路由守卫拦截未登录
  - spec: spec#架构

- [ ] T5: 小程序脚手架
  - goal: Taro 3 + React + TS 小程序骨架
  - files: apps/mini/{package.json, project.config.json, src/app.tsx, src/pages/index/, src/utils/request.ts, src/store/user.ts}
  - acceptance: `pnpm --filter mini dev:weapp` 编译通过；微信开发者工具能预览首页；全局请求封装带 token 注入与 401 静默刷新
  - spec: spec#架构

- [ ] T6: CI/CD 流水线
  - goal: GitHub Actions 流水线
  - files: .github/workflows/{lint.yml, build.yml}, .github/workflows/_matrix.yml
  - acceptance: PR 触发 lint + typecheck + build 三件套；任一失败阻塞合并
  - spec: spec#测试证明

- [parallel] T7, T8, T9

- [ ] T7: 数据库 schema 与 migration
  - goal: 落地 spec 中数据契约
  - files: apps/server/src/{database/, modules/*/entities/}, apps/server/prisma/schema.prisma 或 migrations/
  - acceptance: `pnpm --filter server migration:run` 建出 shop/staff/client/appointment/order/order_item/member_card/card_transaction/service/coupon/staff_schedule 11 张表；索引/外键齐全
  - spec: spec#关键数据契约

- [ ] T8: AuthModule + JWT + RBAC
  - goal: 双端登录与权限装饰器
  - files: apps/server/src/modules/auth/{auth.module.ts, auth.service.ts, auth.controller.ts, jwt.strategy.ts, rbac.guard.ts, decorators/roles.ts}
  - acceptance: 账密登录返回 access+refresh；`wxLogin(code)` 返回 JWT；`@Roles('owner')` 守卫生效；未授权返回 401
  - spec: spec#架构, spec#失败处理

- [ ] T9: NotificationModule（短信/订阅消息 stub）
  - goal: 消息推送降级通道
  - files: apps/server/src/modules/notification/{notification.module.ts, sms.service.ts, wx-subscribe.service.ts, notification.service.ts}
  - acceptance: `notify(clientId, type, payload)` 接口稳定；外部依赖失败时仅记日志不抛错；单元测试覆盖降级路径
  - spec: spec#失败处理

- [parallel] T10, T11, T12

- [ ] T10: ShopModule + StaffModule
  - goal: 店铺/服务目录/员工/排班
  - files: apps/server/src/modules/{shop,staff}/{*.module.ts,*.service.ts,*.controller.ts,entities/,dto/}
  - acceptance: 服务目录 CRUD；员工档案 CRUD；排班按周生成时间槽；swagger 可调用
  - spec: spec#关键数据契约, spec#模块化单体内部模块

- [ ] T11: ClientModule + AppointmentModule
  - goal: 客户档案与预约防重号
  - files: apps/server/src/modules/{client,appointment}/**
  - acceptance: 客户档案/标签 CRUD；预约创建走 Redis 分布式锁 + DB 唯一索引(staff_id, start_time)；并发 100 次同时间槽仅 1 次成功；状态机 pending→confirmed→in_service→done/canceled/no_show
  - spec: spec#关键数据契约, spec#失败处理

- [ ] T12: OrderModule + MemberCardModule
  - goal: 收银开单与会员卡事务化扣减
  - files: apps/server/src/modules/{order,member-card}/**
  - acceptance: 创建订单+扣减卡余额在同一事务内；卡余额不足回滚订单；支持现金/微信/储值/次卡/混合支付；卡流水可追溯
  - spec: spec#关键数据契约, spec#失败处理

- [parallel] T13, T14

- [ ] T13: 管理后台业务页面
  - goal: 接通核心管理流程
  - files: apps/admin/src/pages/{login, dashboard, clients, appointments, orders, staff-schedule}/**
  - acceptance: 登录可进入主界面；客户档案/预约看板/收银开单/员工排班四页可用；先 mock 后接真实 API；关键交互用 React Testing Library 覆盖
  - spec: spec#架构, spec#测试证明

- [ ] T14: 小程序业务页面
  - goal: 接通客户端主流程
  - files: apps/mini/src/pages/{index, services, booking, orders, member, profile}/**
  - acceptance: 微信登录静默完成；首页→服务列表→预约→订单查询→会员卡→个人中心全链路可走通；先 mock 后接真实 API
  - spec: spec#架构, spec#测试证明

- [ ] T15: 端到端 e2e + 压测
  - goal: 验收 M1 核心闭环
  - files: apps/server/test/e2e/{auth-appointment-order-card.e2e-spec.ts}, tests/loadtest/appt-concurrency.yml
  - acceptance: e2e 脚本跑通"登录→预约→到店→收银→会员卡扣减→订单完成"；预约并发压测 100 QPS 下零重号；端到端关键路径成功率 100%
  - spec: spec#测试证明

## 并行约束

- T1 必须先完成（monorepo 结构）
- T2-T6 全部并行（互不依赖）
- T7-T9 依赖 T3（后端骨架）
- T10-T12 依赖 T7+T8（schema 与 Auth 就绪）
- T13-T14 依赖 T6+T7+T8（接口契约稳定后切真实 API，前期 mock）
- T15 依赖 T10-T14 全部完成

## Gate

`docs/staging/plans/2026-09-16-hair-salon-m1.md` 已落地。确认后转入 `subagents` 派发并行任务。
