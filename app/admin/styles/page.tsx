import { AdminLayout } from '@/components/layout';
import { requireAuth } from '@/lib/auth/session';
import { styleService } from '@/lib/services/style.service';
import { StyleManagementContent } from './style-management-content';

export default async function StyleManagementPage() {
  await requireAuth();

  // 从数据库读取风格数据
  const styles = await styleService.findAll();

  return (
    <AdminLayout>
      <StyleManagementContent initialStyles={styles} />
    </AdminLayout>
  );
}
