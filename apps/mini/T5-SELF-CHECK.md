# T5 自检清单 — apps/mini 微信小程序脚手架

> 任务：Taro 3 + React 18 + TS strict + Tailwind + 全局请求封装 + 登录态管理

## 验收项

| # | 验收点 | 状态 | 验证命令 / 证据 |
|---|--------|------|----------------|
| 1 | 仓库根 `pnpm install` 无错 | ✅ | `pnpm install`（产物 1979 个包，含可选 peer 警告，无 install 错误） |
| 2 | `pnpm --filter mini dev:weapp` 编译到 `dist/` | ✅ | `pnpm --filter mini build:weapp` 通过；`dist/` 含 `app.js / app.json / app.wxss / base.wxml / project.config.json / pages/` |
| 3 | 首页显示 Logo 和「欢迎」文案 | ✅ | `src/pages/index/index.tsx` 渲染 Hair Logo + 「欢迎」+「理发店客户小程序」 |
| 3 | profile 页显示「我的」 | ✅ | `src/pages/profile/index.tsx` 渲染「我的」+ 用户名/未登录占位 |
| 4 | request 自动注入 `Authorization: Bearer <token>` | ✅ | `src/utils/request.ts` 在 `finalHeader.Authorization` 注入；`skipAuth` 选项用于登录接口本身 |
| 4 | 401 静默刷新重试 | ✅ | `request.ts` 401 路径调 `refreshAccessToken()` 后 `retry:true` 重试一次；`refreshAccessToken` 走 `/auth/refresh`，失败回退 `ensureLogin` (wx.login → /auth/wx-login) |
| 5 | `auth.ts` 实现 `ensureLogin()` | ✅ | `src/utils/auth.ts` 无 token 时 `wx.login → POST /api/v1/auth/wx-login` 换 JWT；并发合并为同一 promise |
| 6 | tsconfig strict，`@/* → src/*` | ✅ | `tsconfig.json` `strict:true` + `paths:{ "@/*": ["src/*"] }`；同时 Taro `config/index.ts` 中 `alias` + `webpackChain.resolve.alias` 配置保证运行期解析 |
| 7 | tailwind 在 Taro 中可用 | ✅ | 采用 `weapp-tailwindcss/webpack` 的 `UnifiedWebpackPluginV5` + Taro 内置 `postcss.tailwindcss`；构建后 `dist/app.wxss` 含 `.flex / .items-center / .min-h-screen / .justify-center / .bg-gray-50` 等原子类（已 grep 验证） |
| 8 | scripts: dev:weapp / build:weapp / dev:h5 / build:h5 / lint / typecheck | ✅ | `package.json` `scripts` 字段齐备 |
| 9 | TabBar: 首页 / 我的 | ✅ | `src/app.config.ts` `tabBar.list` 两项；`dist/app.json` 已含 `tabBar.list:[首页, 我的]` |
| 10 | 自检清单写入 | ✅ | 本文件 |

## 额外约束

- ✅ 不修改 `apps/server` 或 `apps/admin`，仅创建 `apps/mini/` 下文件
- ✅ `project.config.json` `setting.urlCheck:false`，开发期可访问 `http://localhost:3000` 不被微信开发者工具拦截
- ✅ 后端契约对齐：`POST /api/v1/auth/wx-login` body `{code}` → `{access_token, refresh_token, client:{id,name,avatar}}`；`GET /api/v1/auth/me` 见 `src/services/api.ts`
- ✅ 使用 `zustand` v4 小程序版（`src/store/user.ts` 通过 `create` 返回 hook + `getState()` 在请求层读写）

## 已验证命令

```bash
# 1. 安装依赖（仓库根）
pnpm install

# 2. 类型检查
pnpm --filter mini typecheck
# ✓ 通过（无输出 = 0 错误）

# 3. ESLint
pnpm --filter mini lint
# ✓ 通过（无输出 = 0 错误）

# 4. 生产构建（验证产物）
pnpm --filter mini build:weapp
# ✓ Compiled successfully in 8.86s
#   dist/ 含 app.{js,json,wxss} / base.wxml / project.config.json / pages/

# 5. 开发模式
pnpm --filter mini dev:weapp   # --watch 模式，可用微信开发者工具打开 apps/mini 预览
```

## 文件清单（20 个）

```
apps/mini/
├── package.json
├── tsconfig.json
├── project.config.json
├── babel.config.js
├── tailwind.config.js
├── .eslintrc.json                  # 应用级 eslint，注入 import-resolver-typescript 解析 @/ 别名
├── global.d.ts                     # 注入 Taro 全局类型与 process.env 类型
├── T5-SELF-CHECK.md                # 本文件
├── config/
│   ├── index.ts                    # Taro 配置：framework=react, compiler=webpack5, postcss.tailwindcss, weapp-tailwindcss UnifiedWebpackPluginV5, alias @
│   ├── dev.ts
│   └── prod.ts
└── src/
    ├── app.tsx                     # 入口 App，挂载 ensureLogin()
    ├── app.config.ts              # 全局配置 + tabBar
    ├── app.scss                   # 引入 tailwind 三件套 + page 基础样式
    ├── pages/
    │   ├── index/
    │   │   ├── index.tsx          # 首页：Hair Logo + 「欢迎」
    │   │   ├── index.config.ts
    │   │   └── index.scss
    │   └── profile/
    │       ├── index.tsx          # 我的：显示「我的」+ 用户信息
    │       ├── index.config.ts
    │       └── index.scss
    ├── utils/
    │   ├── request.ts             # Taro.request 封装：token 注入 + 401 静默刷新重试 + skipAuth
    │   └── auth.ts                # ensureLogin(): wx.login → /auth/wx-login 换 JWT；refreshAccessToken()
    ├── store/
    │   └── user.ts                # zustand store: accessToken / refreshToken / client
    └── services/
        └── api.ts                 # 后端契约：wxLoginApi / getMe
```

## 关键依赖版本

- `@tarojs/*` 3.6.25（cli / components / helper / react / router / runtime / shared / taro / plugin-framework-react / plugin-platform-{weapp,h5} / webpack5-runner）
- `react` ^18.2.0, `react-dom` ^18.2.0
- `zustand` ^4.5.0
- `tailwindcss` ^3.4.0
- `weapp-tailwindcss` ^3.1.0（实际安装 3.7.0）
- `typescript` ^5.3.0
- `babel-preset-taro` 3.6.25

## 已知事项

- **peer 警告（非阻断）**：`@tarojs/webpack5-runner → vue-loader → consolidate` 期望 react 16，实际 18。Taro 官方在 3.6.x 仍带此依赖，不影响 React 18 编译。
- **weapp-tailwindcss `/resolve` 子路径不存在**：当前版本（3.7.0）从 `weapp-tailwindcss/webpack` 暴露 `UnifiedWebpackPluginV5`，已使用正确入口。
- **Tailwind content 配置坑**：Taro `postcss.tailwindcss.config` 字段会被原样作为参数传给 `tailwindcss()` PostCSS 插件，因此必须传 Tailwind v3 完整配置对象（直接含 `content/theme/plugins`），不能再用旧版 `tailwindConfig` 嵌套字段——否则会报 `content is missing or empty`。
- **isolatedModules**：tsconfig 设为 `false`，因为 Taro 自带的 `@tarojs/components/types/Script.ts` 在 `isolatedModules:true` 下会报 `Re-exporting a type requires 'export type'`。Babel 仍可正常转译。
- **wxLoginApi 调用方式**：登录接口本身不带 `Authorization`，`request.ts` 用 `skipAuth:true` 防止 ensureLogin 死循环；登录成功后再写入 store，后续请求自动注入 token。
- **`refreshAccessToken` 兜底**：若后端 `/auth/refresh` 不可用或 `refresh_token` 失效，自动回退到完整 `wx.login → /auth/wx-login` 流程，对调用方透明。
- **TabBar 图标**：当前为纯文字 TabBar（无 `iconPath`），符合「论文黑白宋体规范」克制风格；后续如需图标，可在 `src/` 下放 `assets/tabbar/home.png` 等并补 `iconPath/selectedIconPath` 字段。

## 下一步可拓展

- 预约流程页（services / staff 选择 / 时间槽）
- 订单查询 / 会员卡 / 优惠券
- 微信订阅消息授权（`wx.requestSubscribeMessage`）
- 个人中心完善（手机号绑定、头像昵称更新）
- 后端 API base_url 切换为环境变量（dev/prod.ts 注入 `defineConstants`）
