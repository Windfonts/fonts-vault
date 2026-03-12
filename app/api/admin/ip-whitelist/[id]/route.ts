import { handleApiError, withAdmin } from '@/lib/auth/api-guard';
import { db } from '@/lib/db/client';
import { apiIpWhitelist, apiIpWhitelistAudit } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export const DELETE = withAdmin(
  async (_req: NextRequest, session, ctx?: { params: Promise<{ id: string }> }) => {
    try {
      if (!ctx?.params) {
        return NextResponse.json({ code: 400, message: '缺少参数', status: 'fail' }, { status: 400 });
      }
      const { id } = await ctx.params;

      const before = await db.select().from(apiIpWhitelist).where(eq(apiIpWhitelist.id, id)).limit(1);
      if (!before.length) {
        return NextResponse.json({ code: 404, message: '记录不存在', status: 'fail' }, { status: 404 });
      }

      await db.delete(apiIpWhitelist).where(eq(apiIpWhitelist.id, id));

      await db
        .insert(apiIpWhitelistAudit)
        .values({
          id: crypto.randomUUID(),
          createdAt: new Date(),
          action: 'delete',
          whitelistId: id,
          ip: before[0]?.ip ?? null,
          actorId: session.user?.id ?? null,
          actorEmail: session.user?.email ?? null,
          before: JSON.stringify(before[0]),
          after: null,
        })
        .catch(() => undefined);

      return NextResponse.json({ code: 200, data: before[0], message: '删除成功' });
    } catch (error) {
      return handleApiError(error);
    }
  }
);

