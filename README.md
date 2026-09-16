# 理发店管理系统

单店版理发店经营管理与客户服务一体化系统。

## 架构

- **后端**: NestJS 10 + TypeScript + PostgreSQL 16 + Redis 7（模块化单体）
- **管理后台**: React 18 + Ant Design Pro 5 + Vite
- **客户小程序**: Taro 3 + React 18 + TypeScript + Tailwind
- **对象存储**: 阿里云 OSS
- **消息推送**: 微信订阅消息 + 阿里云短信

## 仓库结构

```
hair/
├── apps/
│   ├── server/    NestJS 后端
│   ├── admin/     React 管理后台
│   └── mini/      Taro 微信小程序
├── packages/      共享包（types, ui, utils）
├── docs/          设计文档与路线图
└── docker-compose.yml
```

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动数据库与 Redis
docker compose up -d

# 分别启动各端
pnpm dev:server    # 后端 http://localhost:3000
pnpm dev:admin     # 管理后台 http://localhost:5173
pnpm dev:mini      # 小程序编译到 dist目录，用微信开发者工具打开
```

## 文档

- [设计 Spec](docs/staging/specs/2026-09-16-hair-salon-system.md)
- [M1 计划](docs/staging/plans/2026-09-16-hair-salon-m1.md)
- [路线图](docs/ROADMAP.md)

## 本地开发环境

本仓库内置 `docker-compose.yml`，提供 PostgreSQL 16 + Redis 7 的本地开发依赖（仅开发用，不用于生产）。

### 前置

- Docker Desktop（含 Docker Compose v2）
- PowerShell 5.1+

### 一键启动

```powershell
.\scripts\dev-up.ps1
```

脚本会执行 `docker compose up -d` 并等待两个服务 healthy 后退出。

### 一键关闭

```powershell
.\scripts\dev-down.ps1            # 仅停容器，保留卷数据
.\scripts\dev-down.ps1 -Clean     # 同时清空 ./docker-data，下次启动重新初始化 DB
```

### 服务连接信息

| 服务 | 连接串 |
| --- | --- |
| PostgreSQL | `postgresql://hair:hair_pass@localhost:5432/hair` |
| Redis | `redis://localhost:6379/0` |

与 `.env.example` 的 `DATABASE_URL` / `REDIS_URL` 保持一致；本地开发时复制为 `.env` 即可。

### 数据持久化

- PostgreSQL 数据: `./docker-data/postgres`
- Redis 数据（AOF）: `./docker-data/redis`

两个目录已在 `.gitignore` 中忽略，**不会进入版本控制**。

### 数据库初始化

`scripts/db-init.sql` 通过 `/docker-entrypoint-initdb.d/` 在 PostgreSQL 首次启动（数据目录为空）时自动执行：

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

如需重新执行初始化，请先 `.\scripts\dev-down.ps1 -Clean` 清空卷后再 `.\scripts\dev-up.ps1`。

### 自检清单

完整验收步骤见 `scripts/T2-SELF-CHECK.md`。
