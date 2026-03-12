import { AdminLayout } from '@/components/layout';
import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { apiKeys, apiPlans } from '@/lib/db/schema';
import { asc, desc, eq } from 'drizzle-orm';
import { ApiKeyManagementContent } from './api-key-management-content';

export default async function ApiKeysPage() {
  await requireAuth();

  const plans = await db.select().from(apiPlans).orderBy(asc(apiPlans.dailyQuota));
  const keys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      checksum: apiKeys.checksum,
      ownerEmail: apiKeys.ownerEmail,
      status: apiKeys.status,
      revokedAt: apiKeys.revokedAt,
      expiresAt: apiKeys.expiresAt,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
      updatedAt: apiKeys.updatedAt,
      planId: apiKeys.planId,
      planName: apiPlans.name,
      planSlug: apiPlans.slug,
      planDailyQuota: apiPlans.dailyQuota,
      planActive: apiPlans.isActive,
    })
    .from(apiKeys)
    .leftJoin(apiPlans, eq(apiKeys.planId, apiPlans.id))
    .orderBy(desc(apiKeys.createdAt));

  return (
    <AdminLayout>
      <ApiKeyManagementContent initialKeys={keys} initialPlans={plans} />
    </AdminLayout>
  );
}
