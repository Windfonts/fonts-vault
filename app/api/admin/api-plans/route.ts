import { handleApiError, withAdmin } from '@/lib/auth/api-guard';
import { db } from '@/lib/db/client';
import { apiPlans } from '@/lib/db/schema';
import { asc, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export const GET = withAdmin(async () => {
  try {
    const list = await db.select().from(apiPlans).orderBy(asc(apiPlans.dailyQuota));
    return NextResponse.json({ code: 200, data: list, message: '获取套餐成功' });
  } catch (error) {
    return handleApiError(error);
  }
});

export const PATCH = withAdmin(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const id = typeof body?.id === 'string' ? body.id : null;
    const name = typeof body?.name === 'string' ? body.name.trim() : undefined;
    const dailyQuota = typeof body?.dailyQuota === 'number' ? body.dailyQuota : undefined;
    const isActive = typeof body?.isActive === 'boolean' ? body.isActive : undefined;

    if (!id) {
      return NextResponse.json({ code: 400, message: 'id 必填', status: 'fail' }, { status: 400 });
    }

    const updated = await db
      .update(apiPlans)
      .set({ name, dailyQuota, isActive, updatedAt: new Date() })
      .where(eq(apiPlans.id, id))
      .returning();

    if (!updated.length) {
      return NextResponse.json(
        { code: 404, message: '记录不存在', status: 'fail' },
        { status: 404 }
      );
    }

    return NextResponse.json({ code: 200, data: updated[0], message: '更新成功' });
  } catch (error) {
    return handleApiError(error);
  }
});
