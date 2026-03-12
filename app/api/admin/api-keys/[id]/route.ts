import { generateApiKey } from '@/lib/api/font-api-auth';
import { handleApiError, withAdmin } from '@/lib/auth/api-guard';
import { db } from '@/lib/db/client';
import { apiKeys } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export const PATCH = withAdmin(
  async (_req: NextRequest, _session, ctx?: { params: Promise<{ id: string }> }) => {
    try {
      if (!ctx?.params) {
        return NextResponse.json(
          { code: 400, message: '缺少参数', status: 'fail' },
          { status: 400 }
        );
      }
      const { id } = await ctx.params;
      const body = await _req.json();
      const action = typeof body?.action === 'string' ? body.action : 'update';

      const existing = await db.select().from(apiKeys).where(eq(apiKeys.id, id)).limit(1);
      if (!existing.length) {
        return NextResponse.json(
          { code: 404, message: '密钥不存在', status: 'fail' },
          { status: 404 }
        );
      }

      if (action === 'revoke') {
        const updated = await db
          .update(apiKeys)
          .set({ status: 'revoked', revokedAt: new Date(), updatedAt: new Date() })
          .where(eq(apiKeys.id, id))
          .returning();

        return NextResponse.json({ code: 200, data: updated[0], message: '吊销成功' });
      }

      if (action === 'rotate') {
        const keyPrefix =
          typeof body?.keyPrefix === 'string' ? body.keyPrefix.trim() : existing[0].keyPrefix;
        const generated = generateApiKey(keyPrefix);
        const now = new Date();

        const inserted = await db
          .insert(apiKeys)
          .values({
            id: crypto.randomUUID(),
            name: existing[0].name,
            keyPrefix: generated.keyPrefix,
            keyHash: generated.keyHash,
            checksum: generated.checksum,
            planId: existing[0].planId,
            ownerEmail: existing[0].ownerEmail,
            status: 'active',
            expiresAt: existing[0].expiresAt,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        await db
          .update(apiKeys)
          .set({ status: 'revoked', revokedAt: now, updatedAt: now })
          .where(eq(apiKeys.id, id));

        return NextResponse.json({
          code: 200,
          data: { apiKey: inserted[0], plaintextKey: generated.key, revokedKeyId: id },
          message: '轮换成功',
        });
      }

      const name = typeof body?.name === 'string' ? body.name.trim() : undefined;
      const ownerEmail = typeof body?.ownerEmail === 'string' ? body.ownerEmail.trim() : undefined;
      const planId = typeof body?.planId === 'string' ? body.planId : undefined;
      const expiresAt =
        typeof body?.expiresAt === 'string'
          ? body.expiresAt
            ? new Date(body.expiresAt)
            : null
          : undefined;
      const status =
        body?.status === 'revoked' || body?.status === 'active' ? body.status : undefined;

      const updated = await db
        .update(apiKeys)
        .set({
          name,
          ownerEmail,
          planId,
          expiresAt,
          status,
          updatedAt: new Date(),
        })
        .where(eq(apiKeys.id, id))
        .returning();

      return NextResponse.json({ code: 200, data: updated[0], message: '更新成功' });
    } catch (error) {
      return handleApiError(error);
    }
  }
);
