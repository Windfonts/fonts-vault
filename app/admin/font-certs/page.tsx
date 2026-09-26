import { AdminLayout } from '@/components/layout';
import { requireAdmin } from '@/lib/auth/session';
import { consoleFontCertsService } from '@/lib/services/console-font-certs.service';
import { FontCertsContent } from './font-certs-content';

export default async function AdminFontCertsPage() {
  await requireAdmin();
  const list = consoleFontCertsService.listAll();

  return (
    <AdminLayout>
      <FontCertsContent initialList={list} />
    </AdminLayout>
  );
}
