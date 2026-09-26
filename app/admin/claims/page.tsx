import { AdminLayout } from '@/components/layout';
import { requireAdmin } from '@/lib/auth/session';
import { consoleClaimsService } from '@/lib/services/console-claims.service';
import { ClaimsContent } from './claims-content';

export default async function AdminClaimsPage() {
  await requireAdmin();
  const list = consoleClaimsService.listAll();

  return (
    <AdminLayout>
      <ClaimsContent initialList={list} />
    </AdminLayout>
  );
}
