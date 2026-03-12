import { handleApiError, withAdmin } from '@/lib/auth/api-guard';
import { db } from '@/lib/db/client';
import { apiDomainBlacklist } from '@/lib/db/schema';
import { asc, eq } from 'drizzle-orm';
import { isIP } from 'net';
import { NextRequest, NextResponse } from 'next/server';

const normalizeDomainOrIp = (input: string) => {
  const value = input.trim().toLowerCase();
  if (!value) return null;
  const ipCandidate = value.startsWith('[') && value.endsWith(']') ? value.slice(1, -1) : value;
  if (isIP(ipCandidate) !== 0) return ipCandidate;
  try {
    const url = value.includes('://') ? new URL(value) : new URL(`https://${value}`);
    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
};

export const GET = withAdmin(async () => {
  try {
    const list = await db.select().from(apiDomainBlacklist).orderBy(asc(apiDomainBlacklist.domain));

    return NextResponse.json({ code: 200, data: list, message: '获取黑名单成功' });
  } catch (error) {
    return handleApiError(error);
  }
});

export const POST = withAdmin(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const domain = typeof body?.domain === 'string' ? normalizeDomainOrIp(body.domain) : null;
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : null;
    const isActive = body?.isActive === false ? false : true;

    if (!domain) {
      return NextResponse.json(
        { code: 400, message: 'domain 无效', status: 'fail' },
        { status: 400 }
      );
    }

    const now = new Date();
    const inserted = await db
      .insert(apiDomainBlacklist)
      .values({
        id: crypto.randomUUID(),
        domain,
        reason,
        isActive,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(
      { code: 200, data: inserted[0], message: '添加黑名单成功' },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE')) {
      return NextResponse.json(
        { code: 409, message: '该记录已在黑名单中', status: 'fail' },
        { status: 409 }
      );
    }
    return handleApiError(error);
  }
});

export const PATCH = withAdmin(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const id = typeof body?.id === 'string' ? body.id : null;
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : undefined;
    const isActive = typeof body?.isActive === 'boolean' ? body.isActive : undefined;

    if (!id) {
      return NextResponse.json({ code: 400, message: 'id 必填', status: 'fail' }, { status: 400 });
    }

    const updated = await db
      .update(apiDomainBlacklist)
      .set({ reason, isActive, updatedAt: new Date() })
      .where(eq(apiDomainBlacklist.id, id))
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
