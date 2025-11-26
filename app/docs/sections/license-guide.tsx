import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, XCircle, Info } from 'lucide-react';

export function LicenseGuide() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>字体授权说明</CardTitle>
          <CardDescription>了解不同字体的授权类型和使用限制</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>重要提示</AlertTitle>
            <AlertDescription>
              使用字体前，请务必仔细阅读字体的授权协议。不同字体有不同的使用限制，
              违反授权协议可能导致法律责任。
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* License Types */}
      <Card>
        <CardHeader>
          <CardTitle>授权类型</CardTitle>
          <CardDescription>常见的字体授权类型及其使用范围</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Free Commercial */}
          <div className="border-l-4 border-green-500 pl-4">
            <div className="mb-2 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <h3 className="font-semibold">免费商用</h3>
              <Badge variant="outline" className="bg-green-50">
                推荐
              </Badge>
            </div>
            <p className="text-muted-foreground mb-3 text-sm">
              可以在个人和商业项目中免费使用，无需支付授权费用
            </p>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">允许的使用场景：</h4>
              <ul className="text-muted-foreground space-y-1 text-sm">
                <li>✓ 网站和应用程序</li>
                <li>✓ 印刷品和出版物</li>
                <li>✓ 商业广告和宣传</li>
                <li>✓ 产品包装</li>
                <li>✓ Logo 和品牌设计</li>
              </ul>
              <h4 className="mt-3 text-sm font-semibold">注意事项：</h4>
              <ul className="text-muted-foreground space-y-1 text-sm">
                <li>• 部分字体要求保留版权声明</li>
                <li>• 不得将字体文件单独出售</li>
                <li>• 建议查看具体的授权协议</li>
              </ul>
            </div>
          </div>

          {/* Free Personal */}
          <div className="border-l-4 border-blue-500 pl-4">
            <div className="mb-2 flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500" />
              <h3 className="font-semibold">个人免费</h3>
            </div>
            <p className="text-muted-foreground mb-3 text-sm">
              仅限个人非商业用途，商业使用需要购买授权
            </p>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">允许的使用场景：</h4>
              <ul className="text-muted-foreground space-y-1 text-sm">
                <li>✓ 个人博客和网站</li>
                <li>✓ 学习和研究</li>
                <li>✓ 个人作品展示</li>
              </ul>
              <h4 className="mt-3 text-sm font-semibold">禁止的使用场景：</h4>
              <ul className="text-muted-foreground space-y-1 text-sm">
                <li>✗ 商业网站和应用</li>
                <li>✗ 商业广告</li>
                <li>✗ 产品销售</li>
              </ul>
            </div>
          </div>

          {/* Trial */}
          <div className="border-l-4 border-yellow-500 pl-4">
            <div className="mb-2 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              <h3 className="font-semibold">试用版</h3>
            </div>
            <p className="text-muted-foreground mb-3 text-sm">
              提供有限的试用期或功能限制，正式使用需要购买完整版
            </p>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">常见限制：</h4>
              <ul className="text-muted-foreground space-y-1 text-sm">
                <li>• 试用期限制（如 30 天）</li>
                <li>• 字符集限制（仅包含部分字符）</li>
                <li>• 使用场景限制（仅限测试）</li>
                <li>• 水印或标识</li>
              </ul>
            </div>
          </div>

          {/* Paid */}
          <div className="border-l-4 border-purple-500 pl-4">
            <div className="mb-2 flex items-center gap-2">
              <XCircle className="h-5 w-5 text-purple-500" />
              <h3 className="font-semibold">付费授权</h3>
            </div>
            <p className="text-muted-foreground mb-3 text-sm">
              需要购买授权才能使用，价格根据使用范围和期限而定
            </p>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">授权类型：</h4>
              <ul className="text-muted-foreground space-y-1 text-sm">
                <li>• 单用户授权</li>
                <li>• 企业授权</li>
                <li>• 网站授权（按域名）</li>
                <li>• 应用授权（按应用）</li>
                <li>• 永久授权 vs 订阅授权</li>
              </ul>
            </div>
          </div>

          {/* Contact */}
          <div className="border-l-4 border-gray-500 pl-4">
            <div className="mb-2 flex items-center gap-2">
              <Info className="h-5 w-5 text-gray-500" />
              <h3 className="font-semibold">联系授权</h3>
            </div>
            <p className="text-muted-foreground text-sm">
              需要联系字体厂商或版权方获取授权信息和报价
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Usage Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>使用指南</CardTitle>
          <CardDescription>如何正确使用字体</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="mb-2 font-semibold">1. 查看授权信息</h3>
              <p className="text-muted-foreground text-sm">
                在字体详情页面查看完整的授权信息，包括授权类型、使用限制和价格
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-semibold">2. 确认使用场景</h3>
              <p className="text-muted-foreground text-sm">
                根据您的项目类型（个人/商业）选择合适授权的字体
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-semibold">3. 保留版权声明</h3>
              <p className="text-muted-foreground text-sm">
                如果字体要求保留版权声明，请在项目中适当位置添加
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-semibold">4. 购买授权</h3>
              <p className="text-muted-foreground text-sm">
                对于付费字体，请通过正规渠道购买授权，保留购买凭证
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Common Restrictions */}
      <Card>
        <CardHeader>
          <CardTitle>常见限制</CardTitle>
          <CardDescription>大多数字体授权的通用限制</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>禁止行为</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 space-y-1 text-sm">
                <li>✗ 未经授权将字体文件分发给他人</li>
                <li>✗ 修改字体文件后重新分发</li>
                <li>✗ 将字体文件单独出售</li>
                <li>✗ 在超出授权范围的项目中使用</li>
                <li>✗ 移除或修改字体的版权信息</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <Card>
        <CardHeader>
          <CardTitle>免责声明</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            本平台提供的授权信息仅供参考，具体授权条款以字体版权方的官方声明为准。
            使用字体前，请务必仔细阅读并遵守相关授权协议。因违反授权协议而产生的
            任何法律责任，由使用者自行承担。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
