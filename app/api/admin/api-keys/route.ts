import { generateApiKey } from '@/lib/api/font-api-auth';
import { handleApiError, withAdmin } from '@/lib/auth/api-guard';
import { db } from '@/lib/db/client';
import { apiKeys, apiPlans } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export const GET = withAdmin(async () => {
  try {
    const list = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        checksum: apiKeys.checksum,
        ownerEmail: apiKeys.ownerEmail,
        status: apiKeys.status,
        revokedAt: apiKeys.revokedAt,
        expiresAt: apiKeys.expiresAt,
        lastUsedAt: apiKeys.lastUsedAt,
        createdAt: apiKeys.createdAt,
        updatedAt: apiKeys.updatedAt,
        planId: apiKeys.planId,
        planName: apiPlans.name,
        planSlug: apiPlans.slug,
        planDailyQuota: apiPlans.dailyQuota,
        planActive: apiPlans.isActive,
      })
      .from(apiKeys)
      .leftJoin(apiPlans, eq(apiKeys.planId, apiPlans.id))
      .orderBy(desc(apiKeys.createdAt));

    return NextResponse.json({ code: 200, data: list, message: '获取密钥列表成功' });
  } catch (error) {
    return handleApiError(error);
  }
});

export const POST = withAdmin(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const keyPrefix = typeof body?.keyPrefix === 'string' ? body.keyPrefix.trim() : 'live';
    const ownerEmail = typeof body?.ownerEmail === 'string' ? body.ownerEmail.trim() : null;
    const planId = typeof body?.planId === 'string' ? body.planId : null;
    const expiresAt =
      typeof body?.expiresAt === 'string' && body.expiresAt ? new Date(body.expiresAt) : null;

    if (!name) {
      return NextResponse.json(
        { code: 400, message: 'name 必填', status: 'fail' },
        { status: 400 }
      );
    }

    const generated = generateApiKey(keyPrefix);
    const now = new Date();

    const inserted = await db
      .insert(apiKeys)
      .values({
        id: crypto.randomUUID(),
        name,
        keyPrefix: generated.keyPrefix,
        keyHash: generated.keyHash,
        checksum: generated.checksum,
        planId,
        ownerEmail,
        status: 'active',
        expiresAt,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(
      {
        code: 200,
        data: { apiKey: inserted[0], plaintextKey: generated.key },
        message: '生成密钥成功',
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE')) {
      return NextResponse.json(
        { code: 409, message: '密钥生成冲突，请重试', status: 'fail' },
        { status: 409 }
      );
    }
    return handleApiError(error);
  }
});
