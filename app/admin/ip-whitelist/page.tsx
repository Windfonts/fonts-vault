import { requireAdmin } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

export default async function IpWhitelistPage() {
    await requireAdmin();
    redirect('/admin/domain-whitelist?tab=ip');
}
