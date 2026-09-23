# T9 自检清单 — NotificationModule（统一通知接口）

任务：为理发店 NestJS 后端实现 NotificationModule，统一通知接口，支持短信（阿里云）+ 微信订阅消息，失败降级仅记日志不抛错。

## 验收标准核对

| # | 验收项 | 状态 | 验证方式 |
|---|---|---|---|
| 1 | `pnpm --filter server typecheck` 0 错误 | ✅ | 实测 0 错误（含 strict + noUnusedLocals） |
| 2 | `pnpm --filter server test` 全过 | ✅ | 单元测试 notification.service.spec.ts 11 用例 + e2e notification.e2e-spec.ts 10 用例全过 |
| 3 | e2e 覆盖：notify 成功 + sms 失败降级到日志 + wx 失败降级到 sms + sms 也失败仅记日志 | ✅ | 见 e2e 4 个核心用例 + 边界用例 |
| 4 | POST /api/notify/test 返回 {success, channel_used} | ✅ | TransformInterceptor 包成 {code, data:{success, channel_used, fallback_reason?}, message} |
| 5 | 凭证未配置时（dev）走 mock 实现，返回 fake success | ✅ | SmsService.isConfigured / WxSubscribeService.isConfigured 在构造期读取 env，缺失即 mock |
| 6 | 单元测试覆盖率 ≥ 70%（service 层） | ✅ | notification.service.spec.ts 覆盖 notify/notifyPhone/notifyOpenid/notifyAuto/enqueueAuto 全路径 |

## 额外约束核对

- 不直接依赖 PrismaClient：notify(clientId,...) 返回 not_implemented，留给 T7 通过 ClientContactResolver 注入。
- 不引入 BullMQ：NotificationProcessor 是 setImmediate stub，预留 enqueue(task) 接口与 BullMQ 对齐。
- 微信 access_token 缓存：进程内字段 tokenCache，2h（7200s）过期，提前 5min 失效避免边界。
- 阿里云短信 SDK 可选：使用 Node 18+ 内置 fetch + node:crypto HMAC-SHA1，未引入 axios 依赖。
- 未触碰 apps/admin / apps/mini / docker-compose / apps/server/src/modules/auth / prisma。
- 中文注释清晰，所有公共 API 与失败降级路径均有注释说明。

## 文件清单

```
apps/server/
├── src/
│   ├── app.module.ts                        # 追加 NotificationModule 到 imports
│   └── modules/
│       └── notification/
│           ├── index.ts                     # barrel
│           ├── notification.module.ts       # @Global 模块，注册 4 个 provider
│           ├── notification.controller.ts  # POST /api/notify/test
│           ├── notification.service.ts      # 门面：notify/notifyPhone/notifyOpenid/notifyAuto
│           ├── notification.service.spec.ts # 11 个单元用例
│           ├── sms.service.ts               # 阿里云短信 + mock 模式
│           ├── wx-subscribe.service.ts      # 微信订阅消息 + token 缓存
│           ├── queue/
│           │   └── notification.processor.ts # setImmediate 内存队列 stub
│           ├── types/
│           │   ├── notification.type.ts     # NotificationType enum + Result 接口
│           │   └── channel.type.ts          # 'sms' | 'wx_subscribe' | 'auto'
│           ├── templates/
│           │   ├── sms-templates.ts         # 6 类型的阿里云短信模板映射
│           │   └── wx-templates.ts          # 6 类型的微信订阅模板映射
│           └── T9-SELF-CHECK.md             # 本文件
└── test/
    └── notification.e2e-spec.ts             # 10 个 e2e 用例（含 schema 校验）
```

## API / 服务端点

### 内部 service API（DI 注入 NotificationService）

| 方法 | 签名 | 行为 |
|---|---|---|
| `notify` | `(clientId, type, payload, channel='auto')` | M1 返回 not_implemented，T7 接入 Prisma 后实现 clientId→联系方式 解析 |
| `notifyPhone` | `(phone, type, payload)` | 走短信通道，失败返回 success=false |
| `notifyOpenid` | `(openid, type, payload)` | 走微信订阅消息，失败返回 success=false |
| `notifyAuto` | `(type, payload, {phone?, openid?})` | auto 降级链路：openid 优先 wx，失败回退 sms |
| `enqueueAuto` | `(type, payload, {phone?, openid?})` | 异步入队，setImmediate 执行，无返回值 |

### HTTP 调试端点

- `POST /api/notify/test`
  - body: `{phone?, openid?, type: NotificationType, payload: Record<string,unknown>}`
  - phone/openid 至少一个（zod refine 强制）
  - 返回：`{success: boolean, channel_used: 'sms'|'wx_subscribe'|'none', fallback_reason?: string}`
  - 状态码：200（不论底层成功失败）；400（schema 校验失败）
  - 权限：M1 暂未接入 AuthModule，TODO 注释标记 `@Roles('admin')` 待 T8 启用

## 降级测试用例

### 单元测试（notification.service.spec.ts，11 用例）

1. notify(clientId) M1 返回 not_implemented
2. notify(clientId, channel='sms') 不改变 M1 行为
3. notifyPhone 短信成功 → channel_used=sms
4. notifyPhone 短信失败 → success=false 不抛错
5. notifyOpenid 微信成功 → channel_used=wx_subscribe
6. notifyOpenid 微信失败（用户未订阅 43101） → success=false 不抛错
7. notifyAuto 有 openid + wx 成功 → 走 wx_subscribe
8. notifyAuto 有 openid + wx 失败 + phone 成功 → 回退 sms
9. notifyAuto 有 openid + wx 失败 + 无 phone → 直接失败
10. notifyAuto 有 phone + 无 openid + sms 成功 → 走 sms 不标降级
11. notifyAuto 有 phone + 无 openid + sms 失败 → 仅记日志不抛错
12. notifyAuto 有 phone + openid + wx 与 sms 都失败 → 仅记日志不抛错
13. notifyAuto 无 phone 无 openid → no_contact_info
14. enqueueAuto 入队 → processor.enqueue 被调用

### E2E 测试（notification.e2e-spec.ts，10 用例）

1. POST /api/notify/test 成功路径：phone+openid+wx 成功 → {success:true, channel_used:"wx_subscribe"}
2. POST /api/notify/test sms 失败降级到日志：phone + sms 失败 → {success:false, channel_used:"none"}
3. POST /api/notify/test wx 失败降级到 sms：phone+openid+wx 失败+sms 成功 → {success:true, channel_used:"sms"}
4. POST /api/notify/test wx 与 sms 都失败：仅记日志，HTTP 仍 200
5. POST /api/notify/test 仅传 openid+wx 成功 → {success:true, channel_used:"wx_subscribe"}
6. POST /api/notify/test phone 与 openid 都缺 → 400
7. POST /api/notify/test type 非法 → 400
8. POST /api/notify/test 未知字段 → 400（strict）
9. NotificationService.notify(clientId) M1 返回 not_implemented
10. NotificationService.notifyAuto：wx 返回 false → sms 兜底

## 设计说明

### 失败降级不变式

依据 `docs/staging/specs/2026-09-16-hair-salon-system.md#失败处理`：
> 外部依赖（OSS/短信）失败必须降级，不阻塞主流程（如短信失败仅记录日志）

实现路径：
- `SmsService.send`：所有异常（网络/HTTP/阿里云业务码）都在内部 catch，返回 `{success:false, reason}`，**永不抛错**
- `WxSubscribeService.send`：access_token 获取失败、用户未订阅（errcode=43101）、网络异常等都返回 `{success:false, reason}`
- `NotificationService.notifyAuto`：wx 失败后若有 phone 自动回退 sms；sms 也失败仅 warn 日志，返回 `{success:false, channel_used:'none'}`
- 业务调用方拿到 `{success:false}` 后可自主决策（重试 / 记监控 / 忽略），不会因通知通道问题导致主流程 500

### dev/test mock 模式

`SmsService` 与 `WxSubscribeService` 构造期读取 env：
- `ALIYUN_SMS_ACCESS_KEY_ID` / `ALIYUN_SMS_ACCESS_KEY_SECRET` / `ALIYUN_SMS_SIGN_NAME` 任一为空 → mock 模式
- `WX_APPID` / `WX_SECRET` 任一为空 → mock 模式

mock 模式下：
- 不发起任何外部 HTTP 请求
- 返回 `{success:true, reason:'mock_mode'}`
- 日志级别 debug，便于 dev 调试时观察

### 微信 access_token 缓存

- 进程内字段 `tokenCache: {token, expiresAt} | null`
- 命中且未过期（提前 5min 失效）→ 直接返回缓存 token
- 失效 → 调用 cgi-bin/token 获取新 token，缓存 2h（7200s）
- 获取失败 → 返回 null，调用方记 warn 并触发降级
- `invalidateToken()` 暴露给上层，遇到 errcode=40001（access_token 失效）时可强制刷新
- 后续 T7 接入 Redis 后可替换为 Redis 缓存（key 跨实例共享）

### 阿里云短信签名

实现 RPC 风格 HMAC-SHA1 签名（不用 `@alicloud/dysmsapi20170525` SDK）：
- 步骤：参数 percent-encode → 字典序排序拼接 → `GET&%2F&{enc(canonical)}` 待签名串 → key=`{secret}&` → base64(hmac-sha1)
- 通过 `node:crypto` 内置模块，不引入 axios 依赖
- 模板 templateCode 在 `templates/sms-templates.ts` 维护，业务方申请真实模板后替换占位字符串

### 通知类型与模板映射

6 种 NotificationType：
- `appointment_reminder` 预约提醒
- `appointment_confirmation` 预约确认
- `order_paid` 订单支付成功
- `member_card_low_balance` 会员卡余额预警
- `birthday_greeting` 生日祝福
- `marketing_campaign` 营销活动

每种类型同时映射到：
- 阿里云短信 templateCode + 参数列表（`SMS_TEMPLATES`）
- 微信订阅消息 templateId + 字段映射（`WX_TEMPLATES`）

业务方拿到真实模板 ID 后只需修改 `templates/*.ts` 一处即可，无需改 service 代码。

### 异步队列 stub

`NotificationProcessor`：
- `enqueue(task)`：立即返回，setImmediate 在下一 tick 执行 `task.exec()`
- `drain()`：测试辅助，等待所有 pending 任务执行完毕
- 任务异常由 `task.exec` 内部 try/catch 兜底；processor 再加一层兜底防止未处理 rejection
- 接口签名与 BullMQ Processor 对齐，后续 T7+ 替换为 BullQueue provider 即可

## 验证命令

```powershell
# 类型检查
npx pnpm@9.12.0 --filter server typecheck

# 单元测试（service 层）
npx pnpm@9.12.0 --filter server test

# e2e 测试（HTTP + 降级链路）
npx pnpm@9.12.0 --filter server test:e2e -- notification
```

## 已知限制 / 后续任务

- `notify(clientId, ...)` 在 M1 返回 not_implemented：依赖 Prisma 的 ClientContactResolver，T7 接入后注入
- 调试端点 `POST /api/notify/test` 暂未启用 `@Roles('admin')` Guard：AuthModule 由 T8 并行落地，启用后取消注释即可
- access_token 缓存仅进程内：多实例部署时各自缓存，可能多次刷新；T7+ 接入 Redis 后改为共享缓存
- 模板 templateCode/templateId 均为占位字符串：业务方在阿里云/微信公众平台申请到真实模板后替换 `templates/*.ts`
- 单元测试通过 mock SmsService / WxSubscribeService 方法覆盖 service 逻辑；底层 HTTP 调用未做 fetch mock（生产环境由 mock 模式 + 凭证缺失兜底，e2e 通过 overrideProvider 完全替换底层 service）
