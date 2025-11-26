'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface FaqItem {
  question: string;
  answer: string;
  category: string;
}

const faqData: FaqItem[] = [
  {
    category: '基础使用',
    question: '如何在我的网站中使用字体？',
    answer:
      '您可以通过 CSS API 在网站中加载字体。在 HTML 的 <head> 标签中添加 <link rel="stylesheet" href="/api/css?family=字体名称">，然后在 CSS 中使用 font-family 属性引用该字体。详细步骤请参考"CSS API"文档。',
  },
  {
    category: '基础使用',
    question: '字体加载速度慢怎么办？',
    answer:
      '您可以采取以下措施优化加载速度：1) 只加载需要的字重；2) 使用 preconnect 提示；3) 利用浏览器缓存；4) 考虑使用字体子集。CSS API 已经内置了缓存机制，通常第二次访问会更快。',
  },
  {
    category: '基础使用',
    question: '可以同时使用多个字体吗？',
    answer:
      '可以。使用 | 符号分隔多个字体名称，例如：/api/css?family=思源黑体|思源宋体。但建议不要同时加载过多字体，以免影响页面加载性能。',
  },
  {
    category: '授权相关',
    question: '如何知道一个字体是否可以商用？',
    answer:
      '在字体详情页面会明确标注授权类型。标记为"免费商用"的字体可以在商业项目中使用。如果标记为"个人免费"或"付费授权"，则需要购买商业授权。使用前请务必查看详细的授权信息。',
  },
  {
    category: '授权相关',
    question: '免费商用字体有什么限制吗？',
    answer:
      '大多数免费商用字体可以自由使用，但通常有以下限制：1) 不得单独出售字体文件；2) 部分字体要求保留版权声明；3) 不得修改字体后重新分发。具体限制请查看每个字体的授权协议。',
  },
  {
    category: '授权相关',
    question: '如何购买付费字体的授权？',
    answer:
      '在字体详情页面会显示购买链接或联系方式。您可以直接访问字体厂商的官方网站购买授权，或联系版权方获取报价。购买后请保留授权凭证。',
  },
  {
    category: '技术问题',
    question: '字体在某些浏览器中显示异常怎么办？',
    answer:
      '这可能是浏览器兼容性问题。CSS API 提供的字体格式支持主流浏览器。如果遇到问题，请检查：1) 浏览器版本是否过旧；2) CSS 语法是否正确；3) 字体名称是否拼写正确。如问题持续，请联系技术支持。',
  },
  {
    category: '技术问题',
    question: 'CSS API 支持 HTTPS 吗？',
    answer: '是的，CSS API 完全支持 HTTPS。建议在生产环境中使用 HTTPS 以确保安全性。',
  },
  {
    category: '技术问题',
    question: '可以下载字体文件到本地使用吗？',
    answer:
      '为了保护字体版权和确保授权合规，我们不提供字体文件的直接下载。请使用 CSS API 在线加载字体。如需离线使用，请联系字体版权方获取授权。',
  },
  {
    category: '技术问题',
    question: 'API 有请求频率限制吗？',
    answer:
      '目前 CSS API 没有严格的频率限制，但我们建议合理使用。如果您的项目有大量请求需求，建议利用浏览器缓存机制，避免重复请求相同的资源。',
  },
  {
    category: '账号管理',
    question: '需要注册账号才能使用字体吗？',
    answer:
      '不需要。浏览和使用字体不需要注册账号。只有管理员需要登录才能管理字体、品牌和分类等后台功能。',
  },
  {
    category: '账号管理',
    question: '如何成为管理员？',
    answer: '管理员账号由系统管理员通过环境变量配置。如果您需要管理权限，请联系系统管理员。',
  },
  {
    category: '其他问题',
    question: '字体列表多久更新一次？',
    answer:
      '字体列表通过 OSS 同步功能更新。管理员可以手动触发同步，或设置定期自动同步。新增的字体会在同步后立即显示在列表中。',
  },
  {
    category: '其他问题',
    question: '如何搜索字体？',
    answer:
      '在字体列表页面使用搜索框输入关键词，系统会搜索字体名称、品牌名称和标签。您也可以使用筛选器按分类、品牌等条件筛选字体。',
  },
  {
    category: '其他问题',
    question: '发现字体信息错误怎么办？',
    answer:
      '如果发现字体信息有误，请联系管理员。管理员可以在后台编辑字体信息，或重新同步 OSS 数据以更新信息。',
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const categories = Array.from(new Set(faqData.map((item) => item.category)));

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>常见问题解答</CardTitle>
          <CardDescription>查找关于文风字库的常见问题和解答</CardDescription>
        </CardHeader>
      </Card>

      {categories.map((category) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-lg">{category}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {faqData
              .filter((item) => item.category === category)
              .map((item, index) => {
                const globalIndex = faqData.indexOf(item);
                const isOpen = openIndex === globalIndex;

                return (
                  <div key={globalIndex} className="overflow-hidden rounded-lg border">
                    <button
                      onClick={() => toggleFaq(globalIndex)}
                      className="hover:bg-accent flex w-full items-center justify-between px-4 py-3 text-left transition-colors"
                    >
                      <span className="font-medium">{item.question}</span>
                      {isOpen ? (
                        <ChevronUp className="text-muted-foreground h-5 w-5 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="text-muted-foreground h-5 w-5 flex-shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="bg-muted/50 border-t px-4 py-3">
                        <p className="text-muted-foreground text-sm">{item.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
          </CardContent>
        </Card>
      ))}

      {/* Contact Support */}
      <Card>
        <CardHeader>
          <CardTitle>还有其他问题？</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4 text-sm">
            如果您的问题没有在上面列出，或需要更多帮助，请联系我们的技术支持团队。
          </p>
          <div className="space-y-2 text-sm">
            <p>
              <strong>邮箱：</strong>{' '}
              <a href="mailto:support@example.com" className="text-primary hover:underline">
                support@example.com
              </a>
            </p>
            <p>
              <strong>工作时间：</strong> 周一至周五 9:00 - 18:00
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
