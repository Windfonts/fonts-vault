import { PublicLayout } from '@/components/layout';
import { Metadata } from 'next';
import { DocsContent } from './docs-content';

export const metadata: Metadata = {
  title: '使用文档 - 文风字库',
  description: '了解如何使用文风字库的API和服务',
};

export default function DocsPage() {
  return (
    <PublicLayout>
      <DocsContent />
    </PublicLayout>
  );
}
