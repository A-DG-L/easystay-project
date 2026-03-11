# EasyStay 易宿

> 基于全栈技术构建的综合性在线酒店预订平台

EasyStay 是一个完整的在线酒店预订平台解决方案，采用 Monorepo 架构统一管理移动端（C端）、管理端（B端）和 Node.js 服务端。平台实现了从酒店查询、预订、支付到评价的全流程闭环，并支持多角色权限管理（用户、商户、管理员）。

## 项目结构

```
EASYSTAY-PROJECT/
├── apps/                                   
│   ├── admin/                              # 管理端（B端）
│   │   ├── src/
│   │   │   ├── layouts/
│   │   │   │   └── BasicLayout.jsx
│   │   │   ├── pages/                     
│   │   │   │   ├── Hotel/                 
│   │   │   │   │   ├── HotelList.jsx      # 酒店列表
│   │   │   │   │   ├── HotelPublish.jsx   # 酒店发布/编辑
│   │   │   │   │   └── RoomList.jsx       # 房型列表
│   │   │   │   ├── Audit.jsx          # 审核管理
│   │   │   │   ├── Login.jsx          
│   │   │   │   ├── Register.jsx       
│   │   │   │   └── utils/
│   │   │   │       └── request.js         # 请求工具
│   │   │   ├── App.jsx
│   │   │   └── main.jsx
│   │   ├── package.json
│   │   └── vite.config.js
│   │
│   ├── client/                             # 移动端（C端）
│   │   ├── config/                         # Taro 配置
│   │   │   ├── dev.ts                      
│   │   │   ├── index.ts                    
│   │   │   └── prod.ts                     
│   │   ├── src/
│   │   │   ├── assets/                     # 静态资源
│   │   │   ├── components/                 
│   │   │   │   └── calendar/               # 自定义日历组件
│   │   │   ├── pages/                      
│   │   │   │   ├── booking/                 # 预订页
│   │   │   │   ├── change-pwd/              # 修改密码
│   │   │   │   ├── edit/                    # 编辑信息
│   │   │   │   ├── hotel-detail/            # 酒店详情
│   │   │   │   ├── index/                   # 首页
│   │   │   │   ├── list/                    # 酒店列表/筛选
│   │   │   │   ├── login/                   # 登录
│   │   │   │   ├── register/                # 注册
│   │   │   │   ├── my/                      # 个人中心
│   │   │   │   ├── order/                   # 订单
│   │   │   │   ├── likes-history/           # 收藏/历史
│   │   │   │   └── mv-comments/             # 我的评论
│   │   │   ├── utils/
│   │   │   │   └── request.js         # 请求工具                   
│   │   │   ├── app.config.ts                
│   │   │   ├── app.ts                       
│   │   │   └── app.scss                     
│   │   ├── .env.development                 # 环境配置
│   │   ├── .env.production                  
│   │   ├── package.json
│   │   ├── project.config.json               # 小程序配置
│   │   └── tsconfig.json
│   │
│   └── server/                              # 服务端
│       ├── middleware/                      
│       │   └── auth.js                      # JWT 鉴权
│       ├── models/                          
│       │   ├── User.js                       # 用户模型
│       │   ├── Hotel.js                      # 酒店模型
│       │   ├── Room.js                       # 房型模型
│       │   ├── Order.js                      # 订单模型
│       │   ├── Comment.js                    # 评论模型
│       │   ├── Like.js                       # 收藏模型
│       │   └── History.js                    # 浏览历史
│       ├── routes/                          
│       │   ├── auth.js                       
│       │   ├── hotel.js                      
│       │   ├── room.js                       
│       │   ├── orders.js                     
│       │   ├── comment.js                    
│       │   ├── upload.js                     # 文件上传
│       │   └── user.js                       
│       ├── public/uploads/                   # 上传文件存储
│       └── package.json
│
├── docs/                                     # 项目文档
│   └── API_STANDARD.md                       # API 规范
├── package.json
├── pnpm-workspace.yaml                       # Monorepo 配置
└── pnpm-lock.yaml
```

## 核心功能

### 移动端（C端）
- **完整预订闭环**：酒店查询、列表筛选、详情浏览、在线预订、支付、入住评价
- **个性化用户体系**：酒店收藏、浏览历史、评价中心
- **智能日历组件**：入住/离店日期选择，自动禁用过去日期
- **实时库存筛选**：根据入住日期动态过滤房型库存
- **订单状态管理**：待支付/待使用/待评价/已完成/已取消 5种状态实时同步

### 管理端（B端）
- **商户工作台**：酒店发布、信息编辑、上下架管理
- **房型精细化管控**：价格、库存灵活配置
- **审核管理**：酒店上线审核流程
- **数据统计**：酒店总数、已发布、待审核实时统计

### 服务端
- **多角色鉴权**：JWT实现用户/商户/管理员权限隔离
- **防超卖算法**：按日期维度逐日校验库存
- **状态机驱动**：酒店审核流程（待审核/已发布/已下线）
- **完整业务闭环**：从商户传图、管理员审核到用户下单

## 技术栈

### 服务端
- **核心框架**：Koa
- **数据库**：MongoDB
- **鉴权**：JWT
- **文件上传**：koa-body

### 移动端
- **跨端框架**：Taro
- **核心库**：React + TypeScript
- **样式**：SCSS
- **状态管理**：本地缓存

### 管理端
- **UI框架**：React + AntDesign
- **构建工具**：Vite
- **请求工具**：Axios

## 快速开始

### 前置要求
- Node.js >= 16
- pnpm >= 7
- MongoDB

### 安装

```bash
# 克隆项目
git clone https://github.com/your-repo/easystay.git
cd easystay-project

# 安装依赖
pnpm install

# 配置环境变量
cp apps/server/.env.example apps/server/.env
```

### 启动服务

> **注意**：请严格按照以下顺序启动，**必须先启动服务端**，再启动前端应用

```bash
# 1. 先启动服务端（必须）
cd apps/server
pnpm run dev
# 服务端默认运行在 http://localhost:3000

# 2. 再启动移动端和管理端（微信小程序）
cd apps/client
pnpm dev:weapp

cd apps/admin
pnpm run dev
```

### 环境变量配置

在 `apps/server` 目录下创建 `.env` 文件：

```bash
PORT=3000
MONGODB_URI=mongodb://localhost:27017/easystay
JWT_SECRET=your_jwt_secret_key
UPLOAD_DIR=uploads
MAX_FILE_SIZE=5242880  # 5MB
```

## 项目亮点

### 服务端
- **防超卖算法**：按日期维度逐日校验库存，从底层规避超卖风险
- **RBAC权限隔离**：多角色状态机流转，保障业务安全
- **完整领域模型**：独立拆分了酒店、房型、订单、评价等业务线

### 移动端
- **智能日历组件**：自主研发，解决复杂日期逻辑校验
- **订单状态映射**：前端字段标记，实现5种状态实时同步
- **酒店推荐算法**：相似度计算优化搜索结果

### 管理端
- **图片上传定制**：多图管理、实时预览
- **长列表优化**：服务端分页 + 图片懒加载
- **表单状态隔离**：多层弹窗独立状态管理

## 成果展示

平台包含以下核心页面：

- **移动端**：首页、酒店列表、详情页、预订页、订单中心、评价中心、个人中心
- **管理端**：商户工作台、酒店管理、房型管理、审核管理

## 核心贡献者

| GitHub | 模块 | 主要贡献 |
|--------|------|---------|
| [@A-DG-L](https://github.com/A-DG-L) | 服务端 | 架构设计、API开发、核心算法、全链路打通 |
| [@Mskxn-ui](https://github.com/Mskxn-ui) | 移动端 | 用户体验、日历组件、状态同步、推荐算法 |
| [@Luyue2](https://github.com/Luyue2) | 管理端 | 商户工作台、图片上传、性能优化、表单管理 |

## 协议

MIT License

---

**EasyStay** - 让酒店预订更简单
