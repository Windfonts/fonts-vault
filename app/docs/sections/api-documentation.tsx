import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ApiDocumentation() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API 概述</CardTitle>
          <CardDescription>文风字库提供 RESTful API，支持字体查询、分类浏览等功能</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="mb-2 font-semibold">基础 URL</h3>
            <code className="bg-muted block rounded-md p-3">https://your-domain.com/api</code>
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
        </CardContent>
      </Card>

      {/* Fonts API */}
      <Card>
        <CardHeader>
          <CardTitle>字体接口</CardTitle>
          <CardDescription>获取和管理字体信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* GET /api/fonts */}
          <div className="border-l-4 border-blue-500 pl-4">
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-50">
                GET
              </Badge>
              <code className="text-sm">/api/fonts</code>
            </div>
            <p className="text-muted-foreground mb-3 text-sm">获取字体列表，支持分页和筛选</p>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold">查询参数：</h4>
              <ul className="text-muted-foreground space-y-1 text-sm">
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
                  <code>search</code> - 搜索关键词
                </li>
                <li>
                  <code>sort</code> - 排序方式（name, createdAt, viewCount）
                </li>
              </ul>
              <h4 className="mt-3 text-sm font-semibold">示例请求：</h4>
              <pre className="bg-muted overflow-x-auto rounded-md p-3 text-xs">
                {`GET /api/fonts?page=1&size=20&category=serif&sort=name`}
              </pre>
              <h4 className="mt-3 text-sm font-semibold">响应示例：</h4>
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

          {/* GET /api/fonts/[id] */}
          <div className="border-l-4 border-green-500 pl-4">
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50">
                GET
              </Badge>
              <code className="text-sm">/api/fonts/:id</code>
            </div>
            <p className="text-muted-foreground mb-3 text-sm">获取指定字体的详细信息</p>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">示例请求：</h4>
              <pre className="bg-muted overflow-x-auto rounded-md p-3 text-xs">
                {`GET /api/fonts/550e8400-e29b-41d4-a716-446655440000`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories API */}
      <Card>
        <CardHeader>
          <CardTitle>分类接口</CardTitle>
          <CardDescription>获取字体分类信息</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-l-4 border-purple-500 pl-4">
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline" className="bg-purple-50">
                GET
              </Badge>
              <code className="text-sm">/api/categories</code>
            </div>
            <p className="text-muted-foreground mb-3 text-sm">获取所有字体分类列表</p>
            <div className="space-y-2">
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
        </CardContent>
      </Card>

      {/* Brands API */}
      <Card>
        <CardHeader>
          <CardTitle>品牌接口</CardTitle>
          <CardDescription>获取字体品牌信息</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-l-4 border-orange-500 pl-4">
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline" className="bg-orange-50">
                GET
              </Badge>
              <code className="text-sm">/api/brands</code>
            </div>
            <p className="text-muted-foreground text-sm">获取所有字体品牌列表</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
