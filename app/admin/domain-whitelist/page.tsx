import { AdminLayout } from '@/components/layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { requireAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { apiDomainWhitelist, apiIpWhitelist } from '@/lib/db/schema';
import { asc } from 'drizzle-orm';
import { IpWhitelistContent } from '../ip-whitelist/ip-whitelist-content';
import { DomainWhitelistContent } from './domain-whitelist-content';

interface PageProps {
    searchParams?: {
        tab?: string;
    };
}

export default async function DomainWhitelistPage({ searchParams }: PageProps) {
    await requireAdmin();

    const defaultTab = searchParams?.tab === 'ip' ? 'ip' : 'domain';

    const [domainList, ipList] = await Promise.all([
        db.select().from(apiDomainWhitelist).orderBy(asc(apiDomainWhitelist.domain)),
        db.select().from(apiIpWhitelist).orderBy(asc(apiIpWhitelist.ip)),
    ]);

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div>
                    <h2 className="text-3xl font-bold">白名单</h2>
                    <p className="text-muted-foreground">白名单可免密钥访问字体 API，并可配合分钟级限流保护系统</p>
                </div>

                <Tabs defaultValue={defaultTab}>
                    <TabsList>
                        <TabsTrigger value="domain">域名白名单</TabsTrigger>
                        <TabsTrigger value="ip">IP 白名单</TabsTrigger>
                    </TabsList>

                    <TabsContent value="domain" className="mt-4">
                        <DomainWhitelistContent initialList={domainList} variant="embedded" />
                    </TabsContent>

                    <TabsContent value="ip" className="mt-4">
                        <IpWhitelistContent initialList={ipList} variant="embedded" />
                    </TabsContent>
                </Tabs>
            </div>
        </AdminLayout>
    );
}
