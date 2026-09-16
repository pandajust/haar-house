-- 理发店项目 PG 初始化脚本
-- 由 docker-entrypoint-initdb.d 在 PG 首次启动（数据目录为空）时自动执行
-- 后续重启不会重复执行；如需重新执行请先清空 ./docker-data/postgres

-- 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 备注:
-- - uuid-ossp 提供 uuid_generate_v4()，用于主键生成
-- - pg_trgm 支持模糊检索（客户/服务名搜索）
-- - 业务表 schema 由 NestJS migration 管理，本脚本仅负责扩展与基础初始化
