import { db } from '@/lib/db/client';
import { apiUsageDelivery } from '@/lib/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export type DeliveryUsageInput = {
  day: string;
  subject: string;
  keyId: string | null;
  domain: string;
  family: string;
  bytes: number;
};

/** 规范化 family：取 `|` 多款中的第一段，截断长度。 */
export function normalizeFamilyParam(raw: string): string {
  const first = String(raw || '')
    .split('|')[0]
    .trim()
    .toLowerCase()
    .slice(0, 120);
  return first || 'unknown';
}

/**
 * 异步记一笔 CSS 投递（失败不影响响应）。
 * 按 subject×day×domain×family 累加 count 与 bytes。
 */
export async function recordDeliveryUsage(input: DeliveryUsageInput): Promise<void> {
  const domain = String(input.domain || 'unknown').trim().toLowerCase() || 'unknown';
  const family = normalizeFamilyParam(input.family);
  const day = String(input.day || '').slice(0, 10);
  const subject = String(input.subject || 'anon').trim() || 'anon';
  const bytes = Math.max(0, Math.floor(Number(input.bytes) || 0));
  if (!day) return;
  const now = new Date();

  try {
    await db.transaction(async (tx) => {
      try {
        await tx.insert(apiUsageDelivery).values({
          id: crypto.randomUUID(),
          day,
          subject,
          keyId: input.keyId,
          domain,
          family,
          count: 1,
          bytes,
          updatedAt: now,
        });
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes('UNIQUE') && !message.includes('constraint')) throw error;
      }

      await tx
        .update(apiUsageDelivery)
        .set({
          count: sql`${apiUsageDelivery.count} + 1`,
          bytes: sql`${apiUsageDelivery.bytes} + ${bytes}`,
          updatedAt: now,
          keyId: input.keyId ?? undefined,
        })
        .where(
          and(
            eq(apiUsageDelivery.subject, subject),
            eq(apiUsageDelivery.day, day),
            eq(apiUsageDelivery.domain, domain),
            eq(apiUsageDelivery.family, family)
          )
        );
    });
  } catch (error) {
    logger.warn('[usage-delivery] record failed', {
      domain,
      family,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
