import { AdminLayout } from '@/components/layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { apiDomainBlacklist } from '@/lib/db/schema';
import { asc } from 'drizzle-orm';
import { isIP } from 'net';
import { DomainBlacklistContent } from './domain-blacklist-content';

interface PageProps {
  searchParams?: {
    tab?: string;
  };
}

export default async function DomainBlacklistPage({ searchParams }: PageProps) {
  await requireAuth();

  const list = await db.select().from(apiDomainBlacklist).orderBy(asc(apiDomainBlacklist.domain));
  const defaultTab = searchParams?.tab === 'ip' ? 'ip' : 'domain';
  const ipList = list.filter((x) => isIP(x.domain) !== 0);
  const domainList = list.filter((x) => isIP(x.domain) === 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">黑名单</h2>
          <p className="text-muted-foreground">被加入黑名单的域名或 IP 即使使用有效密钥也无法调用 API</p>
        </div>

        <Tabs defaultValue={defaultTab}>
          <TabsList>
            <TabsTrigger value="domain">域名黑名单</TabsTrigger>
            <TabsTrigger value="ip">IP 黑名单</TabsTrigger>
          </TabsList>

          <TabsContent value="domain" className="mt-4">
            <DomainBlacklistContent initialList={domainList} mode="domain" variant="embedded" />
          </TabsContent>

          <TabsContent value="ip" className="mt-4">
            <DomainBlacklistContent initialList={ipList} mode="ip" variant="embedded" />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
