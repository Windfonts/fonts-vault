import { requireAuth } from '@/lib/auth/session';
import { AdminLayout } from '@/components/layout';
import { CategoryManagementContent } from './category-management-content';
import { categoryService } from '@/lib/services/category.service';

export default async function CategoryManagementPage() {
  await requireAuth();

  // 获取所有分类
  const categories = await categoryService.findAll();

  return (
    <AdminLayout>
      <CategoryManagementContent initialCategories={categories} />
    </AdminLayout>
  );
}
