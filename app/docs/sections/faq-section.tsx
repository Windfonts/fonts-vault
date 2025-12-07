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
    category: '费用与授权',
    question: '使用文风字体需要付费吗？',
    answer:
      '不需要，现阶段所有文风在线字体均可免费使用。未来我们可能会尝试与字体厂商合作推出更多优质字体系列，以保证平台的正常运营和长期发展。',
  },
  {
    category: '费用与授权',
    question: '我可以在商业产品中使用文风字体吗？',
    answer:
      '可以，但请注意部分字体存在设计师及公司的个性主观要求限制，使用时您应仔细查看具体的使用协议和场景。字体授权查询：https://wenfeng.org/license',
  },
  {
    category: '费用与授权',
    question: '如何知道一个字体是否可以商用？',
    answer:
      '在字体详情页面会明确标注授权类型。标记为"免费商用"的字体可以在商业项目中使用。如果标记为"个人免费"或"付费授权"，则需要购买商业授权。使用前请务必查看详细的授权信息。',
  },
  {
    category: '费用与授权',
    question: '免费商用字体有什么限制吗？',
    answer:
      '大多数免费商用字体可以自由使用，但通常有以下限制：1) 不得单独出售字体文件；2) 部分字体要求保留版权声明；3) 不得修改字体后重新分发。具体限制请查看每个字体的授权协议。',
  },
  {
    category: '平台使用',
    question: '文风字体只支持中文字体包吗？',
    answer:
      'Windfonts 作为国内首个类 Google Fonts 的字体服务平台，我们的愿景是希望可以更好的为中文用户服务。目前收集的字体包大部分都支持中文，其中也包含支持英文字符的字体包。后续的改进和完善工作将会明显标记出支持中英文的标识、缺失字符等，并完善字体语言的分类。',
  },
  {
    category: '平台使用',
    question: '我可以在哪些平台使用？',
    answer:
      'Web：网页 Web 端可直接引入当前字体的 CSS 文件使用。WordPress：我们针对 WordPress 用户专门开发了插件，请下载文派叶子🍃(WP-China-Yes) 插件安装即用。CMS：任何建站系统均可自行对接 Windfonts API 来实现自定义功能集成。APP 及小程序：请访问文风开源字体（Wenfeng.org）下载字体切片包或源文件以满足您的嵌入要求。',
  },
  {
    category: '平台使用',
    question: '如何实现使用某款字体包时仅对中文字样起作用？',
    answer:
      '当您引入字体代码的 CSS 样式文件时，请参照"开始使用"的示例代码，只需要引入仅包含中文字符的 CSS 样式文件即可。',
  },
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
      '可以。使用 | 符号分隔多个字体名称，例如：/api/css?family=WF-Qtxtt|WF-Hxbsb。但建议不要同时加载过多字体，以免影响页面加载性能。',
  },
  {
    category: '技术问题',
    question: '什么是可变字体？',
    answer:
      '可变字体是排版领域的新近发展。所有样式都仅存储在一个或两个字体文件中，而不是每个样式都存储在单独的文件中。文风字体将会在未来版本中提供可变字体支持。',
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
    question: 'API 有请求频率限制吗？',
    answer:
      '目前 CSS API 没有严格的频率限制，但我们建议合理使用。如果您的项目有大量请求需求，建议利用浏览器缓存机制，避免重复请求相同的资源。',
  },
  {
    category: '字体管理',
    question: '为什么没有 XXX 免费商用字体？',
    answer:
      '大部分原因可能在于字体厂商的授权方式不允许提供类似 Web 字体服务，所以文风字体不提供这类字体的引用。免费字体并非开源字体，使用时仍需注意区分。',
  },
  {
    category: '字体管理',
    question: '我想要使用的字体没有，如何提交？',
    answer:
      '如果您确认字体的授权没有问题，Windfonts.com 乐意收录该中文字体提供服务，请通过支持论坛或联系我们发送相关的文件下载及授权信息地址。审核无误后将会上传至字库系统进行切片处理。',
  },
  {
    category: '字体管理',
    question: '我是字体作者/厂商，发现某款字体有问题？',
    answer:
      '请通过文风支持论坛、邮箱、联系表单、任何网站公开的方式联系我们，此问题将会在第一时间得到跟进处理。如果您确信需要对某款字体进行下架，根据《民法典》要求您可通过提交侵权投诉或邮件等书面形式发送您（作者信息）及您作品的权利证明（包括但不限于可访问授权网址、版权证书、授权协议等），工作人员确认无误后我们将会下线此字体。虽然对此表示遗憾，但我们尊重作者本身的权利。注意：您的邮件或权利证明信息将在脱敏后面向用户公示，以做记录存证方便未来公众查询、避免再次因字体授权方式不明确导致的侵权行为。',
  },
  {
    category: '字体管理',
    question: '我可以在 Windfonts 上传自己的商用授权字体吗？',
    answer: '现阶段不可以，但您仍然值得期待此功能，我们将会在未来开发计划中考虑这一可能性。',
  },
  {
    category: '字体管理',
    question: '字体列表多久更新一次？',
    answer:
      '字体列表通过 OSS 同步功能更新。管理员可以手动触发同步，或设置定期自动同步。新增的字体会在同步后立即显示在列表中。',
  },
  {
    category: '字体管理',
    question: '发现字体信息错误怎么办？',
    answer:
      '如果发现字体信息有误，请联系管理员。管理员可以在后台编辑字体信息，或重新同步 OSS 数据以更新信息。',
  },
  {
    category: '开源与开发',
    question: 'Windfonts 字体服务器是开源的吗？',
    answer:
      'Windfonts Webfonts Server 的诞生离不开各种开源项目的支持，所以这也将会是一款可以自托管的字体服务器软件。我们计划不仅限于支持中英文字体，对 CJK 中日汉简繁及特殊字符字库均有考量。由于现在还处于开发早期，有很多问题需要处理和完善，具体的源代码版本稳定后将全部开源。具体时间待定，您可以关注文风字体官方新闻通告。',
  },
  {
    category: '其他问题',
    question: '如何搜索字体？',
    answer:
      '在字体列表页面使用搜索框输入关键词，系统会搜索字体名称、品牌名称和标签。您也可以使用筛选器按分类、品牌等条件筛选字体。',
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
            如果您的问题没有在上面列出，或需要更多帮助，请通过以下方式联系我们。
          </p>
          <div className="space-y-2 text-sm">
            <p>
              <strong>官方网站：</strong>{' '}
              <a
                href="https://wenfeng.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                https://wenfeng.org
              </a>
            </p>
            <p>
              <strong>授权查询：</strong>{' '}
              <a
                href="https://wenfeng.org/license"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                https://wenfeng.org/license
              </a>
            </p>
            <p>
              <strong>GitHub：</strong>{' '}
              <a
                href="https://github.com/feicode-com/font-vault"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                https://github.com/feicode-com/font-vault
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
