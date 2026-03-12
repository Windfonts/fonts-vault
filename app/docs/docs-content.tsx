'use client';

import { cn } from '@/lib/utils';
import { useState } from 'react';
import { ApiDocumentation } from './sections/api-documentation';
import { CssApiGuide } from './sections/css-api-guide';
import { FaqSection } from './sections/faq-section';
import { LicenseGuide } from './sections/license-guide';

// Define sections and their TOC structure
const SECTIONS = [
  {
    id: 'api',
    title: 'API 文档',
    description: '文风字库提供 RESTful API，支持字体查询、分类浏览等功能',
    component: ApiDocumentation,
    toc: [
      { id: 'api-overview', title: 'API 概述' },
      { id: 'authentication', title: '认证鉴权' },
      { id: 'fonts-api', title: '字体接口' },
      { id: 'categories-api', title: '分类接口' },
      { id: 'brands-api', title: '品牌接口' },
    ],
    keywords: ['api', '接口', 'endpoint', 'rest']
  },
  {
    id: 'css',
    title: 'CSS API',
    description: '通过 CSS API 在您的网站中安全地加载和使用字体',
    component: CssApiGuide,
    toc: [
      { id: 'css-overview', title: 'CSS API 概述' },
      { id: 'basic-usage', title: '基础用法' },
      { id: 'advanced-usage', title: '高级用法' },
      { id: 'performance-tips', title: '性能优化' },
      { id: 'complete-example', title: '完整示例' },
      { id: 'npm-usage', title: 'NPM 包使用方式' },
    ],
    keywords: ['css', '样式', 'font-face', '字体加载']
  },
  {
    id: 'license',
    title: '授权说明',
    description: '了解不同字体的授权类型和使用限制',
    component: LicenseGuide,
    toc: [
      { id: 'license-overview', title: '字体授权说明' },
      { id: 'license-types', title: '授权类型' },
      { id: 'usage-guidelines', title: '使用指南' },
      { id: 'common-restrictions', title: '常见限制' },
      { id: 'disclaimer', title: '免责声明' },
    ],
    keywords: ['授权', '许可', 'license', '商用', '免费']
  },
  {
    id: 'faq',
    title: '常见问题',
    description: '查找关于文风字库的常见问题和解答',
    component: FaqSection,
    toc: [
      { id: 'faq-overview', title: '常见问题解答' },
      { id: 'contact-support', title: '还有其他问题？' },
    ],
    keywords: ['问题', 'faq', '帮助', '疑问']
  },
];

export function DocsContent() {
  const [activeTab, setActiveTab] = useState('api');

  const activeSection = SECTIONS.find(s => s.id === activeTab) || SECTIONS[0];
  const ActiveComponent = activeSection.component;

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 100; // Adjust for sticky header
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="w-full py-8">
      <div className="flex flex-col md:flex-row gap-8 relative items-start">
        {/* Left Sidebar - Chapter Navigation */}
        <aside className="hidden md:block w-48 shrink-0 sticky top-24 h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar">
          <div className="space-y-6 pb-8">
            <div>
              <nav className="space-y-1">
                {SECTIONS.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => {
                      setActiveTab(section.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                      activeTab === section.id
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {section.title}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </aside>

        {/* Middle Content */}
        <main className="flex-1 min-w-0 min-h-[calc(100vh-200px)]">
          {/* Header */}
          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold tracking-tight">{activeSection.title}</h1>
            <p className="text-muted-foreground text-lg">{activeSection.description}</p>
          </div>

          {/* Active Content */}
          <div className="space-y-8">
            <ActiveComponent />
          </div>
        </main>

        {/* Right Sidebar - Page TOC */}
        <aside className="hidden lg:block w-48 lg:w-64 shrink-0 sticky top-24 h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar">
          <div className="pb-8">
            <ul className="space-y-2 text-sm border-l border-border/40 pl-4">
              {activeSection.toc.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => scrollToSection(item.id)}
                    className="text-muted-foreground hover:text-foreground text-left transition-colors hover:underline block w-full"
                  >
                    {item.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
