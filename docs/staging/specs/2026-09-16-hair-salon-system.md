# 理发店管理系统 设计 Spec

milestone: M1 (see docs/ROADMAP.md)

## 决策（永久层）

### 架构

```
contract:
  客户端:
    - 微信小程序: Taro 3 + React 18 + TypeScript + Tailwind
      面向 C 端用户：预约、查询、付款、评价
    - 管理 Web: React 18 + Ant Design Pro 5 + Vite + TypeScript
      面向店主/员工：经营管理、客户维护、数据看板
  服务端:
    - 单体后端: NestJS 10 + TypeScript，模块化单体（Modular Monolith）
    - 数据库: PostgreSQL 16（主存）+ Redis 7（缓存/锁/会话）
    - 对象存储: 阿里云 OSS（发型照片、会员头像）
    - 消息推送: 微信订阅消息 + 阿里云短信
  通信:
    - RESTful API（管理端、小程序共用）+ JWT 鉴权
    - 微信登录: 小程序走 wx.login → code2session → 自签 JWT
    - 管理端: 账密登录 + RBAC
```

### 模块化单体内部模块

```
invariant:
  每个模块边界:
    - 有独立的 controller / service / repository / dto / entity
    - 模块间只通过 service 接口调用，禁止直接访问对方 repository
    - 共享数据库 schema，但表前缀按模块分组（shop_*, client_*, appt_*, order_*, member_*, marketing_*, staff_*, stats_*)
  模块清单:
    - ShopModule         店铺信息、营业时间、服务目录
    - StaffModule        员工/理发师档案、排班、提成
    - ClientModule       客户档案、标签、偏好
    - AppointmentModule  预约、时间槽、改约/取消
    - OrderModule        开单、收银、退款、支付
    - MemberCardModule   储值卡、次卡、套餐、余额流水
    - MarketingModule    优惠券、活动、积分、推送
    - StatsModule        报表、营业额、复购、业绩
    - AuthModule         登录、JWT、RBAC
    - NotificationModule 微信订阅消息、短信
```

### 关键数据契约

```
contract:
  Client:
    id: uuid
    openid: string (微信)
    phone: string (可空)
    name: string
    gender: 'male' | 'female' | 'unknown'
    tags: string[]
    note: text
    created_at, updated_at
  Appointment:
    id: uuid
    client_id: uuid
    staff_id: uuid
    service_id: uuid
    start_time: timestamptz
    duration_min: int
    status: 'pending' | 'confirmed' | 'in_service' | 'done' | 'canceled' | 'no_show'
    source: 'mini' | 'shop'
    created_at
  Order:
    id: uuid
    client_id: uuid (可空=散客)
    staff_id: uuid (主理发师)
    items: [{ service_id, staff_id, qty, price }]
    pay_method: 'cash' | 'wechat' | 'card_balance' | 'card_times' | 'mixed'
    discount: decimal
    total: decimal
    status: 'paid' | 'refunded'
    created_at
  MemberCard:
    id: uuid
    client_id: uuid
    type: 'stored_value' | 'times' | 'package'
    balance: decimal (储值余额) | int (剩余次数)
    bound_services: uuid[] (次卡/套餐绑定的服务)
    transactions: [{ type, delta, reason, ref_order_id, created_at }]
    status: 'active' | 'frozen' | 'expired'
```

### 失败处理

```
invariant:
  - 预约并发：同一理发师同一时间槽使用 Redis 分布式锁 + 数据库 unique(staff_id, start_time) 防止重号
  - 支付与会员卡扣减必须事务内完成；卡余额不足回滚订单状态
  - 微信登录 code 失效 → 401，前端静默刷新
  - 外部依赖（OSS/短信）失败必须降级，不阻塞主流程（如短信失败仅记录日志）
  - 所有金额使用 decimal(10,2)，禁止 float
```

### 测试证明

```
test:
  - 后端: Jest 单元测试覆盖 service 层；e2e 测试覆盖关键路径（登录→预约→到店→收银→会员卡扣减→出票）
  - 前端: React Testing Library 测关键组件；E2E 用 Playwright 测管理后台主流程
  - 小程序: Taro 内置测试 + 微信开发者工具自动化测试覆盖预约、支付关键路径
  - 验收标准: 预约并发场景压测 100 QPS 下不出现重号；端到端关键路径成功率 100%
```

### 不在本期范围

```
deferred:
  - 连锁多店/多租户隔离（架构预留，不实现）
  - 员工 APP（用管理 Web 移动端适配代替）
  - 复杂库存管理（仅记录耗材采购流水，不做 SKU 管理）
  - 财务对账对接（仅生成报表，不直连财务系统）
  - AI 推荐（发型推荐、客户画像标签留接口，不实现模型）
```

### 并行开发分工

```
contract:
  Agent 切分（按模块边界，互不依赖或通过接口 mock）:
    - Agent A (后端骨架):
        - 项目脚手架、Auth、Shop、Staff 模块 + RBAC + JWT + 鉴权中间件
        - 数据库 schema 设计与 migration
        - 全局异常过滤器、日志、配置中心
    - Agent B (后端业务):
        - Client + Appointment + Order + MemberCard 模块
        - 预约并发锁、收银事务、会员卡扣减
        - Stats 报表查询
    - Agent C (管理后台):
        - Ant Design Pro 脚手架、登录、布局、菜单
        - 客户档案、预约看板、收银开单、员工排班
        - 营销活动、数据报表页
    - Agent D (小程序):
        - Taro 脚手架、微信登录、首页、服务列表
        - 预约流程、订单查询、会员卡、优惠券
        - 订阅消息授权、个人中心
    - Agent E (基础设施):
        - Dockerfile + docker-compose
        - CI/CD（GitHub Actions）
        - OSS 集成、短信集成、定时任务（预约提醒）
  并行依赖约束:
    - A 提供鉴权和基础模块接口后，B/C/D 可并行
    - 接口先用 OpenAPI 文档定义，A 与 C/D 通过 mock 并行
    - E 与所有人并行，提供基础设施
```

## Working notes（草稿层，ship 时清除）

### 待澄清
- 是否需要员工打卡/班次绩效统计？默认按订单提成，不做考勤。
- 会员卡是否需要密码？默认无密码，靠微信身份。
- 是否对接到店核销二维码？默认小程序预约码 + 店员扫码核销，可选实现。

### 已排除方向
- 微服务架构：单店规模过度设计，运维成本不划算
- uni-app：与后台 React 栈不统一，Taro 复用性更好
- Next.js 做管理后台：SSR 对内网管理后台收益小，Ant Design Pro + Vite 更轻
- 自建对象存储：成本高于阿里云 OSS，可靠性差

### 技术假设
- 单店日均订单 < 500，PostgreSQL 单机足够
- 微信小程序为主入口，H5 暂不做
- 管理后台用户数 < 20 人
