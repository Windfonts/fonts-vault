import { AdminLayout } from '@/components/layout';
import { requireAdmin } from '@/lib/auth/session';
import { consoleUploadsService } from '@/lib/services/console-uploads.service';
import { UploadsContent } from './uploads-content';

export default async function AdminUploadsPage() {
  await requireAdmin();
  const list = consoleUploadsService.listAll();

  return (
    <AdminLayout>
      <UploadsContent initialList={list} />
    </AdminLayout>
  );
}
