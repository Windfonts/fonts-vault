import { handleApiError, withAdmin } from '@/lib/auth/api-guard';
import { db } from '@/lib/db/client';
import { apiIpWhitelist, apiIpWhitelistAudit } from '@/lib/db/schema';
import { asc, eq } from 'drizzle-orm';
import { isIP } from 'net';
import { NextRequest, NextResponse } from 'next/server';

const normalizeIp = (input: string) => {
  const value = input.trim();
  if (!value) return null;
  if (isIP(value) === 0) return null;
  return value;
};

const writeAudit = async ({
  action,
  whitelistId,
  ip,
  actorId,
  actorEmail,
  before,
  after,
}: {
  action: 'create' | 'update' | 'delete';
  whitelistId: string | null;
  ip: string | null;
  actorId: string | null;
  actorEmail: string | null;
  before: unknown;
  after: unknown;
}) => {
  await db.insert(apiIpWhitelistAudit).values({
    id: crypto.randomUUID(),
    createdAt: new Date(),
    action,
    whitelistId,
    ip,
    actorId,
    actorEmail,
    before: before == null ? null : JSON.stringify(before),
    after: after == null ? null : JSON.stringify(after),
  });
};

export const GET = withAdmin(async () => {
  try {
    const list = await db.select().from(apiIpWhitelist).orderBy(asc(apiIpWhitelist.ip));
    return NextResponse.json({ code: 200, data: list, message: '获取白名单成功' });
  } catch (error) {
    return handleApiError(error);
  }
});

export const POST = withAdmin(async (req: NextRequest, session) => {
  try {
    const body = await req.json();
    const ip = typeof body?.ip === 'string' ? normalizeIp(body.ip) : null;
    const note = typeof body?.note === 'string' ? body.note.trim() : null;
    const isActive = body?.isActive === false ? false : true;

    if (!ip) {
      return NextResponse.json({ code: 400, message: 'ip 无效', status: 'fail' }, { status: 400 });
    }

    const now = new Date();
    const inserted = await db
      .insert(apiIpWhitelist)
      .values({
        id: crypto.randomUUID(),
        ip,
        note,
        isActive,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await writeAudit({
      action: 'create',
      whitelistId: inserted[0]?.id ?? null,
      ip,
      actorId: session.user?.id ?? null,
      actorEmail: session.user?.email ?? null,
      before: null,
      after: inserted[0] ?? null,
    }).catch(() => undefined);

    return NextResponse.json({ code: 200, data: inserted[0], message: '添加白名单成功' }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE')) {
      return NextResponse.json({ code: 409, message: '该 IP 已在白名单中', status: 'fail' }, { status: 409 });
    }
    return handleApiError(error);
  }
});

export const PATCH = withAdmin(async (req: NextRequest, session) => {
  try {
    const body = await req.json();
    const id = typeof body?.id === 'string' ? body.id : null;
    const note =
      body?.note === null ? null : typeof body?.note === 'string' ? body.note.trim() : undefined;
    const isActive = typeof body?.isActive === 'boolean' ? body.isActive : undefined;

    if (!id) {
      return NextResponse.json({ code: 400, message: 'id 必填', status: 'fail' }, { status: 400 });
    }

    const before = await db.select().from(apiIpWhitelist).where(eq(apiIpWhitelist.id, id)).limit(1);

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (note !== undefined) patch.note = note;
    if (isActive !== undefined) patch.isActive = isActive;

    const updated = await db
      .update(apiIpWhitelist)
      .set(patch as any)
      .where(eq(apiIpWhitelist.id, id))
      .returning();

    if (!updated.length) {
      return NextResponse.json({ code: 404, message: '记录不存在', status: 'fail' }, { status: 404 });
    }

    await writeAudit({
      action: 'update',
      whitelistId: updated[0]?.id ?? id,
      ip: updated[0]?.ip ?? (before[0]?.ip ?? null),
      actorId: session.user?.id ?? null,
      actorEmail: session.user?.email ?? null,
      before: before[0] ?? null,
      after: updated[0] ?? null,
    }).catch(() => undefined);

    return NextResponse.json({ code: 200, data: updated[0], message: '更新成功' });
  } catch (error) {
    return handleApiError(error);
  }
});
