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
