import { requireAuth } from '@/lib/auth/session';
import { AdminLayout } from '@/components/layout';
import { BrandManagementContent } from './brand-management-content';
import { brandService } from '@/lib/services/brand.service';

export default async function BrandManagementPage() {
  await requireAuth();

  // 获取所有品牌
  const brands = await brandService.findAll();

  return (
    <AdminLayout>
      <BrandManagementContent initialBrands={brands} />
    </AdminLayout>
  );
}
