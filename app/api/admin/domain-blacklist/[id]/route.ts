import { handleApiError, withAdmin } from '@/lib/auth/api-guard';
import { db } from '@/lib/db/client';
import { apiDomainBlacklist } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export const DELETE = withAdmin(
  async (_req: NextRequest, _session, ctx?: { params: Promise<{ id: string }> }) => {
    try {
      if (!ctx?.params) {
        return NextResponse.json(
          { code: 400, message: '缺少参数', status: 'fail' },
          { status: 400 }
        );
      }
      const { id } = await ctx.params;
      const deleted = await db
        .delete(apiDomainBlacklist)
        .where(eq(apiDomainBlacklist.id, id))
        .returning();

      if (!deleted.length) {
        return NextResponse.json(
          { code: 404, message: '记录不存在', status: 'fail' },
          { status: 404 }
        );
      }

      return NextResponse.json({ code: 200, data: deleted[0], message: '删除成功' });
    } catch (error) {
      return handleApiError(error);
    }
  }
);
