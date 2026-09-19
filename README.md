# 文风字库 (WindFonts)

> **生产真源：本仓 `fonts-vault`（Next 16）→ https://app.windfonts.com**  
> `next-windfonts` 为遗留归档，请勿双线演进。


> 🎨 专业的在线字体 CDN 平台，海量字体资源，一行代码即可集成

## ✨ 核心特性

### 🚀 高性能 CDN 字体服务

- **即时加载**：通过 CDN 分发，全球加速访问
- **按需加载**：智能字符子集化，仅加载所需字符
- **多版本支持**：提供完整版、常用字、精简版等多种版本

### 📚 丰富的字体资源

- **海量字体库**：涵盖黑体、宋体、楷体、手写、创意等多种风格
- **精细分类**：按风格、品牌、授权类型智能分类
- **实时预览**：所见即所得的字体预览体验

### 🎯 开发者友好

- **简单集成**：一行代码即可引入字体
- **CSS API**：灵活的字体加载方式
- **完整文档**：详细的 API 文档和使用示例

### 🔐 授权管理

- **授权信息透明**：清晰标注每款字体的授权类型
- **商用筛选**：快速筛选免费商用字体
- **版权保护**：尊重字体版权，规范使用

### 🛠️ 强大的管理后台

- **字体同步**：自动从 OSS 同步字体资源
- **批量管理**：支持批量上下架、状态管理
- **数据统计**：浏览量、下载量等数据分析

### 🔒 访问控制更新

- **域名白名单管理**：新增后台 CRUD（支持域名或完整 URL，自动规范化为 hostname）
- **免密钥访问**：白名单域名可免 API Key 访问字体 API，需完全匹配域名
- **不限日配额**：白名单访问不消耗日配额
- **分钟级限流**：白名单与系统域名使用按分钟窗口限流（环境变量 `WHITELIST_PER_MINUTE_LIMIT`，默认 600/分钟）
- **安全审计**：白名单增删改写入审计记录，异常访问保留请求日志
- **持久化与迁移**：新增白名单、审计、分钟窗口计数表与迁移
- **测试覆盖**：补充白名单免密钥、限流与日志写入的单元/集成测试

## 技术栈

- **前端框架**: Next.js 15.5 (App Router)
- **UI 组件**: React 19.1
- **样式**: Tailwind CSS 4.0
- **组件库**: shadcn/ui
- **数据库**: SQLite 3 + Drizzle ORM 0.36
- **认证**: NextAuth.js 5
- **状态管理**: Zustand 5.0
- **数据验证**: Zod 3.23
- **测试**: Vitest 4.0 + fast-check 3.22
- **代码质量**: ESLint 9 + Prettier 3 + Husky 9

## 开发环境设置

### 前置要求

- Node.js 20+
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 环境变量配置

复制 `.env.example` 到 `.env.development` 并配置相应的环境变量：

```bash
cp .env.example .env.development
```

### 数据库初始化

```bash
# 生成数据库迁移文件
npm run db:generate

# 应用迁移
npm run db:migrate

# 打开数据库管理界面
npm run db:studio
```

### 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 可用脚本

- `npm run dev` - 启动开发服务器（使用 Turbopack）
- `npm run build` - 构建生产版本
- `npm run start` - 启动生产服务器
- `npm run typecheck` - TypeScript 类型检查
- `npm run lint` - ESLint 代码检查
- `npm run lint:fix` - 自动修复 ESLint 问题
- `npm run format` - Prettier 格式化代码
- `npm run format:check` - 检查代码格式
- `npm run db:generate` - 生成数据库迁移
- `npm run db:push` - 推送数据库变更
- `npm run db:migrate` - 应用数据库迁移
- `npm run db:studio` - 打开 Drizzle Studio

## 项目结构

```
font-management-system/
├── app/                      # Next.js App Router
│   ├── (public)/            # 公开路由组
│   ├── admin/               # 管理后台
│   ├── api/                 # API 路由
│   └── login/               # 登录页
├── src/
│   ├── components/          # React 组件
│   │   ├── ui/             # shadcn/ui 组件
│   │   ├── font/           # 字体相关组件
│   │   ├── admin/          # 管理后台组件
│   │   └── layout/         # 布局组件
│   ├── lib/
│   │   ├── db/             # 数据库配置和 schema
│   │   └── services/       # 业务逻辑服务
│   ├── types/              # TypeScript 类型定义
│   └── hooks/              # React Hooks
├── data/                    # SQLite 数据库文件
├── drizzle/                 # 数据库迁移文件
└── public/                  # 静态资源
```

## 代码规范

项目使用 ESLint 和 Prettier 进行代码质量控制，并通过 Husky 和 lint-staged 在提交前自动检查和格式化代码。

### 命名规范

- 组件：PascalCase (`FontCard.tsx`)
- 文件：kebab-case (`font-service.ts`)
- 变量/函数：camelCase (`getFontList`)
- 常量：UPPER_SNAKE_CASE (`API_BASE_URL`)
- 类型/接口：PascalCase (`FontCreateDto`)

## License

GPL-3.0