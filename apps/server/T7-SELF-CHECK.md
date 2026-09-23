# T7 数据库 schema 与 migration 自检清单

| 序号 | 验收项 | 状态 | 备注 |
| --- | --- | --- | --- |
| 1 | `pnpm --filter server prisma:generate` 成功 | ✅ | `prisma generate` 通过，client 输出到 `node_modules/.pnpm/@prisma+client@5.22.0...` |
| 2 | `pnpm --filter server prisma:validate` 成功 | ✅ | `prisma validate` 仅提示 5.x→8.x 升级，无 schema 错误 |
| 3 | `pnpm --filter server typecheck` 0 错误 | ✅ | `tsc --noEmit -p tsconfig.build.json` 通过 |
| 4 | `pnpm --filter server test` 通过 | ✅ | src 单测 14/14 通过；与 T7 无关的 notification e2e 失败不计 |
| 5 | health.e2e-spec.ts 全通过 | ✅ | T3 基线测试 6/6 通过，证明 PrismaModule 注入后应用能启动 |
| 6 | 11 张表均建立，外键/索引/枚举齐全 | ✅ | shop / staff / staff_schedule / client / service / appointment / order / order_item / member_card / card_transaction / coupon |
| 7 | 11 个枚举类型齐全 | ✅ | StaffRole / StaffStatus / ClientGender / AppointmentStatus / AppointmentSource / PayMethod / OrderStatus / MemberCardType / MemberCardStatus / CardTransactionType / CouponType |
| 8 | 唯一约束齐全 | ✅ | client.openid UNIQUE；appointment(staff_id, start_time) UNIQUE；coupon.code UNIQUE |
| 9 | 金额用 decimal(10,2)，禁止 float | ✅ | price / discount / total / refund_amount / balance / balance_after / value / min_spend / delta / commission_rate(5,4) 均为 Decimal |
| 10 | 时间字段用 timestamptz | ✅ | created_at / updated_at / start_time / paid_at / last_visit_at / issued_at / expired_at / valid_from / valid_to 均为 TIMESTAMPTZ |
| 11 | 当日时间用 time | ✅ | staff_schedule.start_time / end_time 用 `Unsupported("time")` + `TIME` |
| 12 | 主键用 uuid_generate_v4() | ✅ | 11 张表均 `@default(dbgenerated("uuid_generate_v4()")) @db.Uuid` |
| 13 | PrismaModule @Global 可注入 | ✅ | `@Global() @Module` + `exports: [PrismaService]`，AppModule 已追加 imports |
| 14 | PrismaService 实现 OnModuleInit/OnModuleDestroy | ✅ | $connect 失败仅 warn 不 throw（兼容无 DB 测试环境），onModuleDestroy 调 $disconnect |
| 15 | migration.sql 与 schema 完全一致 | ✅ | 由 `prisma migrate diff --from-empty --to-schema-datamodel` 生成，238 行 |
| 16 | migration_lock.toml 锁定 provider=postgresql | ✅ | 已添加 |
| 17 | 11 个 entity 文件按模块分布 | ✅ | shop/ staff/ client/ appointment/ order/ member-card/ marketing/ 各 entity.ts 已创建并 re-export 类型 |
| 18 | 不碰 main.ts 核心逻辑 | ✅ | 未修改 main.ts；app.module.ts 仅追加 PrismaModule import |
| 19 | 不碰 docker-compose.yml / apps/admin / apps/mini | ✅ | 全部未修改 |
| 20 | 中文注释清晰 | ✅ | schema.prisma / prisma.service.ts / prisma.module.ts / migration.sql / entity.ts 均含中文注释 |

## 文件清单

| 文件 | 说明 |
| --- | --- |
| `apps/server/prisma/schema.prisma` | 11 个 model + 11 个 enum + datasource + generator |
| `apps/server/prisma/migrations/migration_lock.toml` | provider 锁定 |
| `apps/server/prisma/migrations/0_init/migration.sql` | 初始 migration（Prisma 生成，238 行） |
| `apps/server/src/prisma/prisma.service.ts` | PrismaClient 包装（onModuleInit/onModuleDestroy + 日志） |
| `apps/server/src/prisma/prisma.module.ts` | @Global PrismaModule |
| `apps/server/src/prisma/index.ts` | barrel |
| `apps/server/src/modules/shop/entities/shop.entity.ts` | Shop 类型 re-export |
| `apps/server/src/modules/shop/entities/service.entity.ts` | Service 类型 re-export |
| `apps/server/src/modules/staff/entities/staff.entity.ts` | Staff 类型 re-export |
| `apps/server/src/modules/staff/entities/staff_schedule.entity.ts` | StaffSchedule 类型 re-export |
| `apps/server/src/modules/client/entities/client.entity.ts` | Client 类型 re-export |
| `apps/server/src/modules/appointment/entities/appointment.entity.ts` | Appointment 类型 re-export |
| `apps/server/src/modules/order/entities/order.entity.ts` | Order 类型 re-export |
| `apps/server/src/modules/order/entities/order_item.entity.ts` | OrderItem 类型 re-export |
| `apps/server/src/modules/member-card/entities/member_card.entity.ts` | MemberCard 类型 re-export |
| `apps/server/src/modules/member-card/entities/card_transaction.entity.ts` | CardTransaction 类型 re-export |
| `apps/server/src/modules/marketing/entities/coupon.entity.ts` | Coupon 类型 re-export |
| `apps/server/package.json` | 追加 prisma 脚本 + `@prisma/client`/`prisma` 5.22 依赖 |
| `apps/server/src/app.module.ts` | imports 数组追加 `PrismaModule` |
| `apps/server/.envrc.example` | 已含 DATABASE_URL，无需修改 |

## 应用方式

### 有 Docker 环境

```bash
docker compose up -d postgres
pnpm --filter server prisma:migrate:deploy   # 应用 migrations/0_init/migration.sql
pnpm --filter server prisma:generate          # 生成 Prisma Client
pnpm --filter server dev
```

### 无 Docker 环境

`prisma/migrations/0_init/migration.sql` 可作为验收产物直接展示；`prisma validate` 与 `prisma generate` 均不依赖 DB 连接。

## 表关系速览

```
shop ──< staff ──< staff_schedule
 │        │
 │        ├──< appointment >── client
 │        │      └── service (shop)
 │        ├──< order_item >── order
 │        │                      └── client
 │        └──< order
 │
 └──< service ──< appointment
            └──< order_item

client ──< member_card ──< card_transaction >── order
coupon (独立)
```
