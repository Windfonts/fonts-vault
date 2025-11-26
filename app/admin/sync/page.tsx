import { requireAuth } from '@/lib/auth/session';
import { AdminLayout } from '@/components/layout';
import { SyncManagementContent } from './sync-management-content';

export default async function SyncManagementPage() {
  await requireAuth();

  return (
    <AdminLayout>
      <SyncManagementContent />
    </AdminLayout>
  );
}
