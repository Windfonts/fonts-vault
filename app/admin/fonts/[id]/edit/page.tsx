import { AdminLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { requireAuth } from '@/lib/auth/session';
import { brandService } from '@/lib/services/brand.service';
import { categoryService } from '@/lib/services/category.service';
import { fontService } from '@/lib/services/font.service';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FontForm } from '../../font-form';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditFontPage({ params }: PageProps) {
  await requireAuth();

  const { id } = await params;

  // 获取字体详情 - 使用 normalizedName
  const font = await fontService.findByNormalizedName(id);
  if (!font) {
    notFound();
  }

  // 获取品牌、分类和风格列表
  const brands = await brandService.findAll();
  const categories = await categoryService.findAll();
  const { styleService } = await import('@/lib/services/style.service');
  const styles = await styleService.findAll();

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 返回按钮 */}
        <Button variant="ghost" asChild>
          <Link href="/admin/fonts">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回字体列表
          </Link>
        </Button>

        {/* 页面标题 */}
        <div>
          <h2 className="text-3xl font-bold">编辑字体</h2>
          <p className="text-muted-foreground">修改字体 &ldquo;{font.name}&rdquo; 的信息</p>
        </div>

        {/* 表单 */}
        <FontForm
          font={{
            ...font,
            tags: font.tags || undefined,
            fontTags: font.fontTags || undefined,
          }}
          brands={brands}
          categories={categories}
          styles={styles}
          mode="edit"
        />
      </div>
    </AdminLayout>
  );
}
