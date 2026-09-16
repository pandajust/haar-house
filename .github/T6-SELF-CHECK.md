# T6 自检清单 - CI/CD 流水线

任务：为理发店项目搭建 GitHub Actions CI/CD 流水线（lint + typecheck + build 三件套，PR 触发，分支保护）

仓库根：`d:\smallapp\hair`
执行时间：2026-09-16
负责 Agent：T6

## 验收条件逐条核对

### 1. ci.yml 包含 jobs: install/setup-node/pnpm-cache/lint/typecheck/build，matrix node-version: ['20.x', '22.x']

- [x] `install` job（提供 setup-node + pnpm-cache 给后续 job 复用）
- [x] `lint` job
- [x] `typecheck` job
- [x] `build` job
- [x] matrix: `node-version: ['20.x', '22.x']`
- [x] 使用 `actions/setup-node@v4`（setup-node 步骤）
- [x] 使用 `pnpm/action-setup@v3`（pnpm-cache 步骤，配 cache: 'pnpm'）
- [x] `cache-dependency-file: 'pnpm-lock.yaml'`

文件：`.github/workflows/ci.yml`

### 2. pr.yml 触发条件：on pull_request: [opened, synchronize, reopened]

- [x] `on.pull_request.types: [opened, synchronize, reopened]`
- [x] `on.pull_request.branches: [main, develop]`
- [x] 额外：PR 标题 Conventional Commits 校验
- [x] 额外：concurrency 取消同一 PR 旧 run

文件：`.github/workflows/pr.yml`

### 3. lint/typecheck/build 任一失败阻塞合并

- [x] pr.yml 中 lint、typecheck、build 三个 job 独立
- [x] build 依赖 `needs: [lint, typecheck]`，前两个失败 build 不执行
- [x] 文件末尾注释说明了分支保护规则启用方式
- [x] Required status checks 列表已说明（pr-lint / pr-typecheck / pr-build，matrix 会展开为多个）

文件：`.github/workflows/pr.yml`

### 4. release.yml 监听 v* tag，预置 docker build & push 步骤（注释掉，后续填 registry）

- [x] `on.push.tags: ['v*']`
- [x] `build` job：构建所有 apps/* 产物
- [x] `docker` job：注释掉，含 server / admin / mini 三个 matrix
- [x] 注释中说明需要的 Secrets：DOCKER_REGISTRY / DOCKER_USERNAME / DOCKER_PASSWORD / IMAGE_NAME
- [x] 使用 `docker/build-push-action@v5`、`docker/metadata-action@v5`、`docker/login-action@v3`
- [x] 额外：`github-release` job 自动创建 GitHub Release

文件：`.github/workflows/release.yml`

### 5. codeql.yml 周扫 + push 触发

- [x] `on.push.branches: [main, develop]`
- [x] `on.pull_request.branches: [main, develop]`
- [x] `on.schedule.cron: '0 2 * * 1'`（每周一 02:00 UTC = 北京时间 10:00）
- [x] matrix.language: [javascript-typescript]
- [x] 使用 `github/codeql-action/init@v3`、`autobuild@v3`、`analyze@v3`
- [x] queries: +security-and-quality

文件：`.github/workflows/codeql.yml`

### 6. CODEOWNERS 指定 @hair-salon/owners 为全局 owner（占位即可）

- [x] `*  @hair-salon/owners` 全局默认
- [x] 按子包细化：apps/server、apps/admin、apps/mini、packages/、.github/
- [x] 占位说明：仓库启用后替换为真实团队

文件：`.github/CODEOWNERS`

### 7. pull_request_template 包含：变更摘要 / 测试方法 / 关联 issue

- [x] `## 变更摘要`
- [x] `## 测试方法`（含步骤占位）
- [x] `## 关联 issue`（`Closes #`）
- [x] 额外：变更类型复选、影响范围、自检清单

文件：`.github/pull_request_template.md`

### 8. dependabot.yml 周更新 npm + github-actions

- [x] npm 根目录（directory: '/'，周更新）
- [x] npm apps/server（周更新）
- [x] npm apps/admin（周更新）
- [x] npm apps/mini（周更新）
- [x] github-actions（directory: '/'，周更新）
- [x] schedule.interval: 'weekly'，day: 'monday'，timezone: 'Asia/Shanghai'
- [x] ignore semver-major 跳过主版本破坏性升级
- [x] reviewers: hair-salon/owners

文件：`.github/dependabot.yml`

### 9. 自检清单写入 .github/T6-SELF-CHECK.md

- [x] 本文件

文件：`.github/T6-SELF-CHECK.md`

## EXTRA 约束核对

- [x] monorepo 用 pnpm，CI 用 `pnpm/action-setup@v3` + `actions/setup-node@v4`
- [x] pnpm 版本固定 `9.12.0`
- [x] 子包名 server / admin / mini（见 CODEOWNERS、release.yml matrix、dependabot.yml）
- [x] 未碰 apps/ 或根 package.json
- [x] 未碰 docker-compose.yml
- [x] YAML 语法人工检查通过（无 Tab 缩进、无冒号后缺空格、引号匹配）

## 创建文件清单

| 文件 | 用途 |
|---|---|
| `.github/workflows/ci.yml` | 主流程：install/lint/typecheck/build，matrix 20.x/22.x |
| `.github/workflows/pr.yml` | PR 专用：on pull_request [opened, synchronize, reopened] |
| `.github/workflows/release.yml` | tag v* 触发：build + docker push（注释）+ GitHub Release |
| `.github/workflows/codeql.yml` | 安全扫描：push + 周一 02:00 UTC 周扫 |
| `.github/pull_request_template.md` | PR 模板：变更摘要 / 测试方法 / 关联 issue |
| `.github/ISSUE_TEMPLATE/bug_report.md` | Bug 报告模板 |
| `.github/ISSUE_TEMPLATE/feature_request.md` | 功能需求模板 |
| `.github/CODEOWNERS` | 全局 owner: @hair-salon/owners |
| `.github/dependabot.yml` | 周更新 npm（4 个目录） + github-actions |
| `.github/T6-SELF-CHECK.md` | 本自检清单 |
| `.gitlab-ci.yml` | 备用 GitLab CI 配置 |

## 待仓库启用后手动配置

- [ ] 在 GitHub 仓库 Settings → Branches 启用分支保护：main / develop
  - [ ] Require status checks to pass before merging
  - [ ] Required status checks: `Lint (node 20.x)`、`Lypecheck (node 20.x)`、`Build (node 20.x)` 等 matrix 展开名
  - [ ] Require branches up to date before merging
  - [ ] Require pull request reviews before merging
  - [ ] Require CODEOWNER review
- [ ] 创建 GitHub Team `hair-salon/owners` 并添加成员（替换 CODEOWNERS 占位）
- [ ] 如启用 Docker push：配置 Secrets `DOCKER_REGISTRY` / `DOCKER_USERNAME` / `DOCKER_PASSWORD` / `IMAGE_NAME`
- [ ] 如启用 CodeQL：仓库 Settings → Security → Code security analyses 确认启用
- [ ] push 第一份 `pnpm-lock.yaml`（首次运行 `pnpm install` 后生成）

## 风险与注意事项

1. **pnpm-lock.yaml 当前可能缺失**：首次 push 后 CI 会因为 `--frozen-lockfile` 失败，需要先在本地执行 `pnpm install` 生成锁文件并提交。
2. **matrix 任务名展开**：GitHub Actions 把 `Lint (node ${{ matrix.node-version }})` 展开为 `Lint (node 20.x)` / `Lint (node 22.x)`，分支保护 Required status check 需选这两个名字。
3. **apps/server 等子包** 当前未由本 Agent 创建（由其他并行 Agent 负责），CI 中的 `pnpm -r --filter=./apps/* ...` 在 apps/ 为空时会失败；此为预期行为，等其他 Agent 落地 apps/ 后即通过。
4. **docker push 步骤注释**：等镜像仓库（阿里云 ACR 或 GHCR）确定后取消注释并填入 Secrets。
5. **GitLab CI 为可选备用**，仓库托管在 GitHub 时可忽略。
