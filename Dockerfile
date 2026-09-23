# syntax=docker/dockerfile:1.7
# 理发店管理系统后端生产镜像 (NestJS + Prisma)
ARG NODE_VERSION=20.18.0-alpine

# ---- Base ----
FROM node:${NODE_VERSION} AS base
RUN apk add --no-cache libc6-compat openssl
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN npm install -g pnpm@9.12.0
WORKDIR /app

# ---- Deps ----
# 仅复制 workspace 元信息 + server package.json, 利用 pnpm 缓存加速
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/server/package.json apps/server/package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter server... --filter hair-salon-system

# ---- Builder ----
FROM base AS builder
COPY --from=deps /app /app
COPY apps/server ./apps/server
WORKDIR /app/apps/server
RUN pnpm prisma:generate
RUN pnpm build

# ---- Runner ----
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app/apps/server
COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/apps/server/prisma ./prisma
COPY --from=builder /app/node_modules ../node_modules
COPY --from=builder /app/apps/server/package.json ./package.json
EXPOSE 3000
# 启动前自动执行 Prisma migration deploy
CMD ["sh", "-c", "npx prisma migrate deploy --schema=prisma/schema.prisma && node dist/main.js"]