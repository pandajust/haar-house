# T4 自检清单 - 管理后台脚手架

> 任务：Vite + React 18 + Ant Design Pro 5 + TS strict + 路由 + axios 拦截器 + 登录布局骨架
> 负责范围：`apps/admin/`（不触碰 `apps/server` / `apps/mini`）

## 创建文件清单

### 任务要求文件（22 项）
- [x] `apps/admin/package.json`
- [x] `apps/admin/tsconfig.json`
- [x] `apps/admin/tsconfig.node.json`
- [x] `apps/admin/vite.config.ts`
- [x] `apps/admin/index.html`
- [x] `apps/admin/src/main.tsx`
- [x] `apps/admin/src/App.tsx`
- [x] `apps/admin/src/router/index.tsx`
- [x] `apps/admin/src/router/routes.tsx`
- [x] `apps/admin/src/router/RequireAuth.tsx`
- [x] `apps/admin/src/layouts/BasicLayout.tsx`
- [x] `apps/admin/src/layouts/BlankLayout.tsx`
- [x] `apps/admin/src/pages/Login/index.tsx`
- [x] `apps/admin/src/pages/Dashboard/index.tsx`
- [x] `apps/admin/src/pages/404.tsx`
- [x] `apps/admin/src/utils/request.ts`
- [x] `apps/admin/src/utils/auth.ts`
- [x] `apps/admin/src/store/user.ts`
- [x] `apps/admin/src/locales/zh-CN.ts`
- [x] `apps/admin/.envrc.example`
- [x] `apps/admin/tailwind.config.js`
- [x] `apps/admin/src/styles/global.css`

### 补充支撑文件（脚手架可运行所需）
- [x] `apps/admin/postcss.config.js` —— Tailwind 3 需要 PostCSS 入口
- [x] `apps/admin/.eslintrc.json` —— 注入 `import/internal-regex: ^@/` 让 `@/` 走 internal 组排序
- [x] `apps/admin/src/vite-env.d.ts` —— 声明 `ImportMetaEnv` 让 `import.meta.env.VITE_*` 类型安全
- [x] `apps/admin/src/test/setup.ts` —— Vitest setup，注册 jest-dom matchers
- [x] `apps/admin/src/utils/auth.test.ts` —— auth 工具单测，保证 `test` 脚本不空跑

## 验收对照表（10 条 + 验证命令）

| # | ACCEPTANCE 条款 | 实现位置 / 验证方式 |
| --- | --- | --- |
| 1 | `pnpm install` 在根目录无错 | 根目录执行 `pnpm install`；本包未碰 server/mini |
| 2 | `pnpm --filter admin dev` 启动 vite 监听 5173 | `vite.config.ts` `server.port=5173` `host=0.0.0.0` |
| 3 | `/login` 默认重定向到登录页 | `router/routes.tsx` `/login` 路由挂 `BlankLayout+Login`；`/` 默认跳 `/dashboard`，未登录由 RequireAuth 转发 `/login` |
| 4 | `/dashboard` 受 RequireAuth 保护，未登录跳 `/login` | `router/RequireAuth.tsx` 检查 `getAccessToken()`，无则 `<Navigate to="/login" state={{from}}>` |
| 5 | axios 自动附 `Authorization: Bearer <token>`；401 清 token 跳 `/login` | `utils/request.ts` 请求拦截器注入 `Authorization`；响应拦截器 `status===401` 调 `clearTokens()` + `window.location.href='/login'` |
| 6 | tsconfig strict，paths `@/* → src/*` | `tsconfig.json` `strict:true` + `noUnusedLocals/Parameters` + `paths: { "@/*": ["src/*"] }` |
| 7 | Ant Design Pro 5 + dayjs + @ant-design/icons | `package.json` deps：`antd@^5.21.6` `@ant-design/pro-components@^2.8.2` `@ant-design/icons@^5.5.1` `dayjs@^1.11.13`；`main.tsx` `ConfigProvider` + `dayjs.locale('zh-cn')` |
| 8 | Tailwind 与 antd 5 共存（prefixClassName 配置避免冲突） | `tailwind.config.js` `prefix: 'tw-'` + `corePlugins.preflight: false`；utility 写作 `className="tw-flex"`；antd 类前缀保留默认 `ant-`，零冲突 |
| 9 | package.json scripts: dev/build/preview/lint/typecheck/test | `package.json` `scripts` 六件齐全 |
| 10 | 自检清单写入 `apps/admin/T4-SELF-CHECK.md` | 本文件 |

## 关键实现说明

### 路由结构（React Router 6）
```
/            -> RequireAuth -> BasicLayout (Outlet 渲染子路由)
  index     -> <Navigate to="/dashboard" replace />
  dashboard -> <Dashboard />
/login       -> BlankLayout -> <Login />
*            -> <NotFound />
```

### 后端 API 契约对接
- `POST /api/v1/auth/login` body `{username, password}` → `{access_token, refresh_token, user}`
  - 实现位置：`store/user.ts` `login()` 调 `request.post<LoginResponse>('/auth/login', {username, password})`
  - baseURL 自动拼 `VITE_API_BASE_URL + VITE_API_PREFIX` = `http://localhost:3000/api/v1`
- `GET /api/v1/auth/me` → 当前用户
  - 实现位置：`store/user.ts` `fetchMe()` 调 `request.get<UserInfo>('/auth/me')`，由 `RequireAuth` 在已登录且无 user 时拉取
- DEV mock：`apps/admin/.envrc.example` 控制 `VITE_DEV_MOCK_LOGIN`，DEV 模式下 `admin/admin` 直接走 mock token，避免依赖未就绪的后端

### axios 拦截器
- 请求拦截器：`config.headers.Authorization = 'Bearer ' + getAccessToken()`
- 响应拦截器：`error.response.status === 401` → `clearTokens()` + 跳 `/login?from=<原路径>`
- 不在拦截器中直接 `react-router.navigate`，避免路由/store 循环依赖，用整页跳转触发 `RequireAuth` 重判

### 状态管理（zustand）
- `store/user.ts` 暴露 `useUserStore`：`user / loading / login / logout / fetchMe / setUser`
- 仅在 `useUserStore` 里调用 `request`，页面只通过 selector 订阅

### Tailwind × antd 共存策略
- Tailwind：`prefix='tw-'` + `preflight:false`，所有 utility 类带 `tw-` 前缀
- antd：保留默认 `prefixCls='ant'`，CSS-in-JS 与 Tailwind utility 互不干扰
- 使用方式：业务页面 className 写 `tw-flex tw-p-4`；组件内样式走 antd token

## 验证命令（在仓库根 d:\smallapp\hair 执行）

```bash
# 1. 依赖安装（所有 workspace 包一次性）
pnpm install

# 2. 类型检查（本任务仅 admin）
pnpm --filter admin typecheck

# 3. lint（可选，根 .eslintrc.json 已含 apps/*/tsconfig.json）
pnpm --filter admin lint

# 4. 单测
pnpm --filter admin test

# 5. 启动开发服务（监听 5173）
pnpm --filter admin dev
# 浏览器访问 http://localhost:5173
#   未登录 → 自动跳 /login
#   输入 admin / admin → 跳 /dashboard
#   直接访问 /dashboard 未登录 → 跳 /login

# 6. 生产构建
pnpm --filter admin build
pnpm --filter admin preview
```

## 未完成 / 遗留事项
- T13 将在此骨架上接通真实业务页面（客户档案/预约看板/收银开单/员工排班），届时移除 `store/user.ts` 内的 DEV mock 分支
- 联调期需在后端就绪后，将 `.envrc.example` 复制为 `.envrc` 并按需调整 `VITE_API_BASE_URL`
- e2e（Playwright）由 T15 统一覆盖，不在本骨架范围

## 完成确认
- 上述 22 项任务文件 + 5 项支撑文件全部创建
- `pnpm --filter admin typecheck` 通过
- 路由守卫 / axios 拦截器 / zustand store 三大契约实现位置见上表
