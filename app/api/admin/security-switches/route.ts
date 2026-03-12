import { handleApiError, withAdmin } from '@/lib/auth/api-guard';
import { db } from '@/lib/db/client';
import { securitySwitches } from '@/lib/db/schema';
import {
    clearSecuritySwitchCache,
    ensureSecuritySwitchRow,
    type SecuritySwitchKey,
    writeSecuritySwitchAudit,
} from '@/lib/security/security-switches';
import { asc, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

const ALL_KEYS: SecuritySwitchKey[] = [
  'domain_blacklist',
  'domain_whitelist',
  'ip_whitelist',
  'api_key_auth',
  'whitelist_rate_limit',
  'anonymous_daily_quota',
];

export const GET = withAdmin(async () => {
  try {
    await Promise.all(ALL_KEYS.map((key) => ensureSecuritySwitchRow(key)));
    const list = await db.select().from(securitySwitches).orderBy(asc(securitySwitches.key));
    return NextResponse.json({ code: 200, data: list, message: '获取开关成功' });
  } catch (error) {
    return handleApiError(error);
  }
});

export const PATCH = withAdmin(async (req: NextRequest, session) => {
  try {
    const body = await req.json();
    const key = typeof body?.key === 'string' ? (body.key as SecuritySwitchKey) : null;
    const hasEnabled = Object.prototype.hasOwnProperty.call(body, 'enabled');
    const enabled =
      hasEnabled && typeof body?.enabled === 'boolean' ? body.enabled : hasEnabled ? null : undefined;
    if (enabled === null) {
      return NextResponse.json(
        { code: 400, message: 'enabled 无效', status: 'fail' },
        { status: 400 }
      );
    }
    if (enabled === undefined) {
      return NextResponse.json(
        { code: 400, message: 'enabled 必填', status: 'fail' },
        { status: 400 }
      );
    }

    if (!key || !ALL_KEYS.includes(key)) {
      return NextResponse.json({ code: 400, message: 'key 无效', status: 'fail' }, { status: 400 });
    }

    const before = await db
      .select()
      .from(securitySwitches)
      .where(eq(securitySwitches.key, key))
      .limit(1);

    if (!before.length) {
      await ensureSecuritySwitchRow(key);
    }

    const patch: Record<string, unknown> = { updatedAt: new Date(), enabled };

    const updated = await db
      .update(securitySwitches)
      .set(patch as any)
      .where(eq(securitySwitches.key, key))
      .returning();

    if (!updated.length) {
      return NextResponse.json({ code: 404, message: '记录不存在', status: 'fail' }, { status: 404 });
    }

    await writeSecuritySwitchAudit({
      action: 'update',
      switchKey: key,
      actorId: session.user?.id ?? null,
      actorEmail: session.user?.email ?? null,
      before: before[0] ?? null,
      after: updated[0] ?? null,
    }).catch(() => undefined);

    clearSecuritySwitchCache();

    return NextResponse.json({ code: 200, data: updated[0], message: '更新成功' });
  } catch (error) {
    return handleApiError(error);
  }
});
