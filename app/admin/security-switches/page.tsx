import { AdminLayout } from '@/components/layout';
import { requireAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { securitySwitches } from '@/lib/db/schema';
import { ensureSecuritySwitchRow, type SecuritySwitchKey } from '@/lib/security/security-switches';
import { asc } from 'drizzle-orm';
import { SecuritySwitchesContent } from './security-switches-content';

const ALL_KEYS: SecuritySwitchKey[] = [
    'domain_blacklist',
    'domain_whitelist',
    'ip_whitelist',
    'api_key_auth',
    'whitelist_rate_limit',
    'anonymous_daily_quota',
];

export default async function SecuritySwitchesPage() {
    await requireAdmin();

    await Promise.all(ALL_KEYS.map((key) => ensureSecuritySwitchRow(key)));
    const list = await db.select().from(securitySwitches).orderBy(asc(securitySwitches.key));

    return (
        <AdminLayout>
            <SecuritySwitchesContent initialList={list} />
        </AdminLayout>
    );
}
