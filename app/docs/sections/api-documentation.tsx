import { Badge } from '@/components/ui/badge';

export function ApiDocumentation() {
  // 获取当前域名
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="space-y-12">
      <div id="api-overview" className="space-y-4">
        <div className="space-y-6 pt-4">
          <div>
            <h3 className="mb-2 font-semibold">基础 URL</h3>
            <code className="bg-muted block rounded-md p-3">{baseUrl}/api</code>
          </div>
          <div>
            <h3 className="mb-2 font-semibold">响应格式</h3>
            <p className="text-muted-foreground mb-2 text-sm">
              所有 API 响应均为 JSON 格式，包含以下字段：
            </p>
            <pre className="bg-muted overflow-x-auto rounded-md p-4 text-sm">
              {`{
  "code": 200,
  "message": "success",
  "data": { ... }
}`}
            </pre>
          </div>
        </div>
      </div>

      <div className="my-8 border-t" />

      {/* Authentication */}
      <div id="authentication" className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">认证鉴权</h2>
          <p className="text-muted-foreground mt-2">API 使用密钥认证机制来管理访问权限和配额</p>
        </div>
        <div className="space-y-6">
          <p className="text-muted-foreground text-sm leading-relaxed">
            虽然大部分 GET 接口支持匿名访问，但会受到严格的速率限制（默认 100 次/天）。
            建议申请 API 密钥以获得更高的调用配额。
          </p>
          <div className="rounded-md border p-4">
            <h3 className="font-semibold">白名单免密钥访问</h3>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              当请求域名被加入白名单后，可免 API Key 访问字体 API，且不计入日配额。
              白名单需完全匹配域名（仅匹配 hostname），由管理员统一配置。
            </p>
            <ul className="text-muted-foreground mt-3 space-y-2 text-sm list-disc pl-4">
              <li>域名匹配：仅匹配规范化后的 hostname，不支持通配符</li>
              <li>请求要求：需携带 Origin 头（浏览器发起的跨域/同域请求通常会自动携带）</li>
              <li>日配额：不消耗日配额</li>
              <li>
                分钟限流：默认 600 次/分钟，可通过
                <code className="bg-muted mx-1 rounded px-1 py-0.5 text-xs">WHITELIST_PER_MINUTE_LIMIT</code>
                调整
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">认证方式</h3>
            <p className="text-muted-foreground text-sm">
              您可以通过以下两种方式之一传递 API 密钥：
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-md border p-4">
                <h4 className="font-medium mb-2 text-sm">Header 方式 (推荐)</h4>
                <div className="space-y-2">
                  <code className="bg-muted block rounded p-2 text-xs">
                    Authorization: Bearer wf_live_...
                  </code>
                  <div className="text-muted-foreground text-xs text-center">- 或 -</div>
                  <code className="bg-muted block rounded p-2 text-xs">
                    X-API-Key: wf_live_...
                  </code>
                </div>
              </div>

              <div className="rounded-md border p-4">
                <h4 className="font-medium mb-2 text-sm">Query 参数方式</h4>
                <div className="space-y-2">
                  <code className="bg-muted block rounded p-2 text-xs">
                    ?apiKey=wf_live_...
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="my-8 border-t" />

      {/* Fonts API */}
      <div id="fonts-api" className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">字体接口</h2>
          <p className="text-muted-foreground mt-2">获取和管理字体信息</p>
        </div>
        <div className="space-y-8">
          {/* GET /api/fonts */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                GET
              </Badge>
              <code className="text-sm font-medium">/api/fonts</code>
            </div>
            <p className="text-muted-foreground text-sm">获取字体列表，支持分页和筛选</p>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold">查询参数：</h4>
              <ul className="text-muted-foreground space-y-2 text-sm list-disc pl-4">
                <li>
                  <code>page</code> - 页码（默认：1）
                </li>
                <li>
                  <code>size</code> - 每页数量（默认：20）
                </li>
                <li>
                  <code>category</code> - 分类 ID
                </li>
                <li>
                  <code>brand</code> - 品牌 ID
                </li>
                <li>
                  <code>search</code> / <code>q</code> - 搜索关键词（<code>q</code> 为 <code>search</code> 别名）
                </li>
                <li>
                  <code>sort</code> - 排序方式（name, createdAt, viewCount）
                </li>
              </ul>

              <div className="space-y-2 mt-4">
                <h4 className="text-sm font-semibold">示例请求：</h4>
                <pre className="bg-muted overflow-x-auto rounded-md p-3 text-xs">
                  {`GET /api/fonts?page=1&size=20&category=serif&sort=name`}
                </pre>
              </div>

              <div className="space-y-2 mt-4">
                <h4 className="text-sm font-semibold">响应示例：</h4>
                <pre className="bg-muted overflow-x-auto rounded-md p-3 text-xs">
                  {`{
  "code": 200,
  "data": {
    "total": 100,
    "page": 1,
    "pageTotal": 5,
    "dataList": [
      {
        "id": "uuid",
        "name": "思源黑体",
        "fontFamily": "Source Han Sans",
        "category": { "name": "无衬线体" },
        "brand": { "name": "Adobe" }
      }
    ]
  }
}`}
                </pre>
              </div>
            </div>
          </div>

          {/* GET /api/fonts/[family] */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                GET
              </Badge>
              <code className="text-sm font-medium">/api/fonts/:family</code>
            </div>
            <p className="text-muted-foreground text-sm">获取指定字体的详细信息（支持 ID 或字体族名称）</p>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">示例请求：</h4>
              <pre className="bg-muted overflow-x-auto rounded-md p-3 text-xs">
                {`GET /api/fonts/qtxtt`}
              </pre>
            </div>
          </div>
        </div>
      </div>

      <div className="my-8 border-t" />

      {/* Categories API */}
      <div id="categories-api" className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">分类接口</h2>
          <p className="text-muted-foreground mt-2">获取字体分类信息</p>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              GET
            </Badge>
            <code className="text-sm font-medium">/api/categories</code>
          </div>
          <p className="text-muted-foreground text-sm">获取所有字体分类列表</p>
          <div className="space-y-2 mt-4">
            <h4 className="text-sm font-semibold">响应示例：</h4>
            <pre className="bg-muted overflow-x-auto rounded-md p-3 text-xs">
              {`{
  "code": 200,
  "data": [
    {
      "id": "uuid",
      "name": "无衬线体",
      "slug": "sans-serif",
      "description": "现代简洁的字体风格"
    }
  ]
}`}
            </pre>
          </div>
        </div>
      </div>

      <div className="my-8 border-t" />

      {/* Brands API */}
      <div id="brands-api" className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">品牌接口</h2>
          <p className="text-muted-foreground mt-2">获取字体品牌信息</p>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
              GET
            </Badge>
            <code className="text-sm font-medium">/api/brands</code>
          </div>
          <p className="text-muted-foreground text-sm">获取所有字体品牌列表</p>
        </div>
      </div>
    </div>
  );
}
