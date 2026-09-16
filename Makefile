.PHONY: install dev dev-server dev-admin dev-mini build lint typecheck test format clean db redis

# 一次性安装依赖
install:
	pnpm install

# 同时启动三端（需要先 pnpm install 并启动 docker compose）
dev:
	pnpm -r --parallel --filter=./apps/* dev

dev-server:
	pnpm --filter server dev

dev-admin:
	pnpm --filter admin dev

dev-mini:
	pnpm --filter mini dev:weapp

# 数据库与 Redis
db:
	docker compose up -d postgres redis

redis:
	docker compose up -d redis

db-reset:
	docker compose down -v
	docker compose up -d postgres redis

# 代码质量
lint:
	pnpm -r --filter=./apps/* lint

typecheck:
	pnpm -r --filter=./apps/* typecheck

test:
	pnpm -r --filter=./apps/* test

format:
	pnpm format

build:
	pnpm -r --filter=./apps/* build

clean:
	pnpm -r --filter=./apps/* exec rm -rf dist build .turbo .cache coverage
	rm -rf node_modules
