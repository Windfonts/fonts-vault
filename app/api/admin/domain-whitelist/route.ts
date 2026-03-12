import { handleApiError, withAdmin } from '@/lib/auth/api-guard';
import { db } from '@/lib/db/client';
import { apiDomainWhitelist, apiDomainWhitelistAudit } from '@/lib/db/schema';
import { asc, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

const normalizeDomain = (input: string) => {
  const value = input.trim().toLowerCase();
  if (!value) return null;
  try {
    const url = value.includes('://') ? new URL(value) : new URL(`https://${value}`);
    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
};

const writeAudit = async ({
  action,
  whitelistId,
  domain,
  actorId,
  actorEmail,
  before,
  after,
}: {
  action: 'create' | 'update' | 'delete';
  whitelistId: string | null;
  domain: string | null;
  actorId: string | null;
  actorEmail: string | null;
  before: unknown;
  after: unknown;
}) => {
  await db.insert(apiDomainWhitelistAudit).values({
    id: crypto.randomUUID(),
    createdAt: new Date(),
    action,
    whitelistId,
    domain,
    actorId,
    actorEmail,
    before: before == null ? null : JSON.stringify(before),
    after: after == null ? null : JSON.stringify(after),
  });
};

export const GET = withAdmin(async () => {
  try {
    const list = await db.select().from(apiDomainWhitelist).orderBy(asc(apiDomainWhitelist.domain));
    return NextResponse.json({ code: 200, data: list, message: '获取白名单成功' });
  } catch (error) {
    return handleApiError(error);
  }
});

export const POST = withAdmin(async (req: NextRequest, session) => {
  try {
    const body = await req.json();
    const domain = typeof body?.domain === 'string' ? normalizeDomain(body.domain) : null;
    const note = typeof body?.note === 'string' ? body.note.trim() : null;
    const isActive = body?.isActive === false ? false : true;

    if (!domain) {
      return NextResponse.json(
        { code: 400, message: 'domain 无效', status: 'fail' },
        { status: 400 }
      );
    }

    const now = new Date();
    const inserted = await db
      .insert(apiDomainWhitelist)
      .values({
        id: crypto.randomUUID(),
        domain,
        note,
        isActive,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await writeAudit({
      action: 'create',
      whitelistId: inserted[0]?.id ?? null,
      domain,
      actorId: session.user?.id ?? null,
      actorEmail: session.user?.email ?? null,
      before: null,
      after: inserted[0] ?? null,
    }).catch(() => undefined);

    return NextResponse.json(
      { code: 200, data: inserted[0], message: '添加白名单成功' },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE')) {
      return NextResponse.json(
        { code: 409, message: '该域名已在白名单中', status: 'fail' },
        { status: 409 }
      );
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

    const before = await db
      .select()
      .from(apiDomainWhitelist)
      .where(eq(apiDomainWhitelist.id, id))
      .limit(1);

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (note !== undefined) patch.note = note;
    if (isActive !== undefined) patch.isActive = isActive;

    const updated = await db
      .update(apiDomainWhitelist)
      .set(patch as any)
      .where(eq(apiDomainWhitelist.id, id))
      .returning();

    if (!updated.length) {
      return NextResponse.json(
        { code: 404, message: '记录不存在', status: 'fail' },
        { status: 404 }
      );
    }

    await writeAudit({
      action: 'update',
      whitelistId: updated[0]?.id ?? id,
      domain: updated[0]?.domain ?? (before[0]?.domain ?? null),
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
