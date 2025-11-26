# 管理后台仪表板 - 结构说明

## 页面布局

```
┌─────────────────────────────────────────────────────────────┐
│ AdminHeader (顶部导航栏)                                      │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                  │
│ Sidebar  │  主内容区域                                       │
│          │                                                  │
│ (侧边栏) │  ┌────────────────────────────────────────────┐ │
│          │  │ 欢迎区域                                    │ │
│          │  │ - 标题: "管理后台"                          │ │
│          │  │ - 副标题: "欢迎回来，{用户名}"              │ │
│          │  └────────────────────────────────────────────┘ │
│          │                                                  │
│          │  ┌────────────────────────────────────────────┐ │
│          │  │ 统计卡片区域 (5列网格)                      │ │
│          │  │                                             │ │
│          │  │ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌────┐ │ │
│          │  │ │字体数│ │品牌数│ │分类数│ │浏览量│ │下载│ │ │
│          │  │ │ 150  │ │  25  │ │  10  │ │50000 │ │量  │ │ │
│          │  │ └──────┘ └──────┘ └──────┘ └──────┘ └────┘ │ │
│          │  └────────────────────────────────────────────┘ │
│          │                                                  │
│          │  ┌────────────────────────────────────────────┐ │
│          │  │ 快速操作区域                                │ │
│          │  │                                             │ │
│          │  │ [添加字体] [添加品牌] [添加分类] [同步字体] │ │
│          │  └────────────────────────────────────────────┘ │
│          │                                                  │
│          │  ┌──────────────────┬──────────────────────────┐│
│          │  │ 最近更新         │ 热门字体                 ││
│          │  │                  │                          ││
│          │  │ 字体列表表格     │ 字体列表表格             ││
│          │  │ - 字体名称       │ - 字体名称               ││
│          │  │ - 分类           │ - 分类                   ││
│          │  │ - 品牌           │ - 浏览量                 ││
│          │  │ - 更新时间       │ - 下载量                 ││
│          │  │                  │                          ││
│          │  │ [查看全部]       │ [查看全部]               ││
│          │  └──────────────────┴──────────────────────────┘│
│          │                                                  │
└──────────┴──────────────────────────────────────────────────┘
```

## 组件层次结构

```
AdminPage (Server Component)
├── AdminLayout
│   ├── AdminHeader
│   ├── Sidebar
│   └── Main Content
│       ├── 欢迎区域
│       │   ├── h2: "管理后台"
│       │   └── p: "欢迎回来，{用户名}"
│       │
│       ├── 统计卡片区域 (Grid: md:grid-cols-2 lg:grid-cols-5)
│       │   ├── Card: 总字体数
│       │   │   ├── CardHeader (FileText icon)
│       │   │   └── CardContent (数字 + 描述)
│       │   ├── Card: 品牌数
│       │   │   ├── CardHeader (Tag icon)
│       │   │   └── CardContent (数字 + 描述)
│       │   ├── Card: 分类数
│       │   │   ├── CardHeader (Layers icon)
│       │   │   └── CardContent (数字 + 描述)
│       │   ├── Card: 总浏览量
│       │   │   ├── CardHeader (Eye icon)
│       │   │   └── CardContent (数字 + 描述)
│       │   └── Card: 总下载量
│       │       ├── CardHeader (Download icon)
│       │       └── CardContent (数字 + 描述)
│       │
│       ├── 快速操作区域
│       │   └── Card
│       │       ├── CardHeader
│       │       └── CardContent
│       │           ├── Button: 添加字体 (Plus icon)
│       │           ├── Button: 添加品牌 (Plus icon)
│       │           ├── Button: 添加分类 (Plus icon)
│       │           └── Button: 同步字体 (RefreshCw icon)
│       │
│       └── 字体列表区域 (Grid: lg:grid-cols-2)
│           ├── Card: 最近更新
│           │   ├── CardHeader
│           │   │   ├── Title (Clock icon)
│           │   │   └── Button: 查看全部
│           │   └── CardContent
│           │       └── Table
│           │           ├── TableHeader
│           │           │   ├── 字体名称
│           │           │   ├── 分类
│           │           │   ├── 品牌
│           │           │   └── 更新时间
│           │           └── TableBody
│           │               └── TableRow (×5)
│           │                   ├── Link: 字体名称
│           │                   ├── Badge: 分类
│           │                   ├── Badge: 品牌
│           │                   └── 更新时间
│           │
│           └── Card: 热门字体
│               ├── CardHeader
│               │   ├── Title (TrendingUp icon)
│               │   └── Button: 查看全部
│               └── CardContent
│                   └── Table
│                       ├── TableHeader
│                       │   ├── 字体名称
│                       │   ├── 分类
│                       │   ├── 浏览量
│                       │   └── 下载量
│                       └── TableBody
│                           └── TableRow (×5)
│                               ├── Link: 字体名称
│                               ├── Badge: 分类
│                               ├── Eye icon + 浏览量
│                               └── Download icon + 下载量
```

## 响应式断点

### 移动端 (< 768px)

- 统计卡片: 单列堆叠
- 字体列表: 单列堆叠
- 侧边栏: 隐藏或折叠

### 平板 (768px - 1024px)

- 统计卡片: 2 列网格
- 字体列表: 单列堆叠

### 桌面 (≥ 1024px)

- 统计卡片: 5 列网格
- 字体列表: 2 列并排
- 侧边栏: 固定显示

## 颜色和样式

### 统计卡片

- 背景: 白色 (Card)
- 图标: text-muted-foreground
- 数字: text-2xl font-bold
- 描述: text-xs text-muted-foreground

### 快速操作按钮

- 主按钮: 默认样式
- 次要按钮: variant="outline"
- 图标: mr-2 h-4 w-4

### 字体列表表格

- Badge (分类): variant="secondary"
- Badge (品牌): variant="outline"
- 链接: hover:underline
- 图标: h-3 w-3 text-muted-foreground

## 数据流

```
用户访问 /admin
    ↓
requireAuth() 验证权限
    ↓
Server Component 获取数据:
    ├── fontService.getStats()
    ├── fontService.getLatestFontsWithRelations(5)
    └── fontService.getPopularFontsWithRelations(5)
    ↓
渲染 HTML (服务端)
    ↓
发送到客户端
    ↓
客户端水合 (Hydration)
    ↓
交互式页面
```

## 交互行为

### 点击行为

1. **统计卡片**: 无点击行为（仅展示）
2. **快速操作按钮**: 导航到对应页面
3. **字体名称链接**: 导航到字体详情/编辑页
4. **查看全部按钮**: 导航到完整列表页

### 悬停效果

- 链接: 下划线
- 按钮: 背景色变化
- 表格行: 背景色高亮

## 空状态处理

当没有数据时：

```tsx
<div className="text-muted-foreground py-8 text-center">暂无字体数据</div>
```

## 数字格式化

```typescript
// 千位分隔符
{
  stats.totalViews.toLocaleString();
} // 50,000

// 日期格式化
{
  new Date(font.updatedAt).toLocaleDateString('zh-CN');
} // 2024/1/15
```

## 图标使用

来自 `lucide-react`:

- FileText: 字体
- Tag: 品牌
- Layers: 分类
- Eye: 浏览量
- Download: 下载量
- Clock: 最近更新
- TrendingUp: 热门
- Plus: 添加
- RefreshCw: 同步

## 性能考虑

1. **服务端渲染**: 所有数据在服务端获取
2. **数据限制**: 最近/热门各只显示 5 条
3. **关联查询**: 使用 `WithRelations` 避免 N+1 查询
4. **静态优化**: 使用 Next.js 的自动优化
