'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ApiDocumentation } from './sections/api-documentation';
import { CssApiGuide } from './sections/css-api-guide';
import { FaqSection } from './sections/faq-section';
import { LicenseGuide } from './sections/license-guide';

export function DocsContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('api');

  // Search functionality - filters content based on query
  const filteredContent = useMemo(() => {
    if (!searchQuery.trim()) return null;

    const query = searchQuery.toLowerCase();
    const sections = [
      { id: 'api', title: 'API 文档', keywords: ['api', '接口', 'endpoint', 'rest'] },
      { id: 'css', title: 'CSS API', keywords: ['css', '样式', 'font-face', '字体加载'] },
      { id: 'license', title: '授权说明', keywords: ['授权', '许可', 'license', '商用', '免费'] },
      { id: 'faq', title: '常见问题', keywords: ['问题', 'faq', '帮助', '疑问'] },
    ];

    return sections.filter(
      (section) =>
        section.title.toLowerCase().includes(query) ||
        section.keywords.some((keyword) => keyword.includes(query))
    );
  }, [searchQuery]);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-4 text-4xl font-bold">使用文档</h1>
        <p className="text-muted-foreground text-lg">了解如何使用文风字库的 API 和服务</p>
      </div>

      {/* Search Bar */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
            <Input
              type="text"
              placeholder="搜索文档内容..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Search Results */}
          {filteredContent && filteredContent.length > 0 && (
            <div className="mt-4">
              <p className="text-muted-foreground mb-2 text-sm">
                找到 {filteredContent.length} 个相关章节：
              </p>
              <div className="space-y-2">
                {filteredContent.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => {
                      setActiveTab(section.id);
                      setSearchQuery('');
                    }}
                    className="hover:bg-accent w-full rounded-md px-4 py-2 text-left transition-colors"
                  >
                    <span className="font-medium">{section.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {filteredContent && filteredContent.length === 0 && (
            <p className="text-muted-foreground mt-4 text-sm">未找到匹配的内容</p>
          )}
        </CardContent>
      </Card>

      {/* Documentation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="api">API 文档</TabsTrigger>
          <TabsTrigger value="css">CSS API</TabsTrigger>
          <TabsTrigger value="license">授权说明</TabsTrigger>
          <TabsTrigger value="faq">常见问题</TabsTrigger>
        </TabsList>

        <TabsContent value="api" className="mt-6">
          <ApiDocumentation />
        </TabsContent>

        <TabsContent value="css" className="mt-6">
          <CssApiGuide />
        </TabsContent>

        <TabsContent value="license" className="mt-6">
          <LicenseGuide />
        </TabsContent>

        <TabsContent value="faq" className="mt-6">
          <FaqSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
