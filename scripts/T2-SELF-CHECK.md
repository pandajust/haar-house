# T2 本地开发环境 自检清单

> 任务: 为理发店项目搭建本地 docker-compose 开发环境（PostgreSQL 16 + Redis 7 + 初始化脚本）
> 沙箱环境未安装 Docker，故无法在本任务执行时实时验证 `docker compose ps`，
> 以下为完整验收步骤，请在已安装 Docker Desktop 的机器上执行。

## 创建的文件

| 路径 | 用途 |
| --- | --- |
| `docker-compose.yml` | PG 16 + Redis 7 编排，端口/卷/healthcheck 全部就绪 |
| `scripts/db-init.sql` | PG 启动初始化脚本：建扩展 `uuid-ossp` / `pg_trgm` |
| `scripts/dev-up.ps1` | PowerShell 一键启动并等待 healthy |
| `scripts/dev-down.ps1` | PowerShell 一键关闭，支持 `-Clean` 清空卷 |
| `scripts/T2-SELF-CHECK.md` | 本自检文档 |
| `README.md`（末尾追加） | 追加「本地开发环境」段落 |

## 验收步骤（按顺序执行）

### 1. 前置检查

```powershell
docker --version          # Docker version 24+ 即可
docker compose version    # Docker Compose version v2.20+
```

### 2. 一键启动

```powershell
cd D:\smallapp\hair
.\scripts\dev-up.ps1
```

预期：
- 拉取 `postgres:16-alpine` 与 `redis:7-alpine` 镜像（首次会下载）
- 脚本最后输出 `[dev-up] 完成: PG 与 Redis 均已 healthy。`
- 自动打印 `docker compose ps`，两个服务均为 `healthy`

### 3. 验收要点逐项核对

| # | Acceptance | 验证命令 | 预期 |
| --- | --- | --- | --- |
| 1 | `docker compose up -d` 能起 PG+Redis | `.\scripts\dev-up.ps1` | 两容器 Up |
| 2 | PG: 库 hair / 用户 hair / 密码 hair_pass / 5432 | `docker exec -it hair-postgres psql -U hair -d hair -c '\l'` | 列表中存在 `hair` |
| 3 | Redis: 端口 6379、密码可空 | `docker exec -it hair-redis redis-cli ping` | `PONG` |
| 4 | PG 卷 `./docker-data/postgres` | `Test-Path .\docker-data\postgres` | `True`，且内含 PGDATA |
| 5 | Redis 卷 `./docker-data/redis` | `Test-Path .\docker-data\redis` | `True`，含 `appendonly.aof` |
| 6 | db-init.sql 自动执行、扩展已建 | `docker exec -it hair-postgres psql -U hair -d hair -c "SELECT extname FROM pg_extension;"` | 至少包含 `uuid-ossp`、`pg_trgm` |
| 7 | dev-up / dev-down 一键 | `.\scripts\dev-down.ps1` 后 `.\scripts\dev-up.ps1` | 流程顺畅 |
| 8 | healthcheck 配置齐全 | `docker compose ps` | 两服务 `STATUS` 列含 `(healthy)` |

### 4. 连通性测试

```powershell
# 后端 DATABASE_URL（与 .env.example 一致）
docker exec -it hair-postgres psql -U hair -d hair -c "SELECT version();"
# 应输出 PostgreSQL 16.x ...

# Redis
docker exec -it hair-redis redis-cli -h localhost -p 6379 ping
# PONG
```

### 5. 一键关闭

```powershell
.\scripts\dev-down.ps1            # 仅停容器，保留卷
.\scripts\dev-down.ps1 -Clean     # 同时清空 docker-data（重置 DB）
```

## 常见问题

- **端口占用**: 如本地 5432/6379 已被占用，可修改 `docker-compose.yml` 的 `ports` 前半段（主机端口），并同步更新 `.env` 的 `DATABASE_URL` / `REDIS_URL`。
- **initdb 未重新执行**: `/docker-entrypoint-initdb.d/` 只在 PG 数据目录为空时执行；如需重跑初始化请用 `.\scripts\dev-down.ps1 -Clean`。
- **WLS2 与磁盘**: 在 Windows 上 `./docker-data/...` 通过 WSL2 bind mount，性能足够开发使用。

## 与其他 Agent 的边界

- 不涉及 `apps/` 目录、不修改 `package.json`、不运行 npm/pnpm install。
- `.env.example` 已存在且 `DATABASE_URL` / `REDIS_URL` 与本编排一致，无需改动。
