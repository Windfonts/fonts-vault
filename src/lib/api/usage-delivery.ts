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
  weight?: string;
  /** HTTP 状态：200 / 304（及将来 403） */
  status?: string | number;
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

/** 规范化字重名：小写、去空白，最长 40。 */
export function normalizeWeightParam(raw: string): string {
  const w = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .slice(0, 40);
  return w || 'regular';
}

/** 规范化 HTTP 状态码字符串。 */
export function normalizeStatusParam(raw: string | number): string {
  const s = String(raw || '').trim();
  if (s === '200' || s === '304' || s === '403') return s;
  const n = Number(s);
  if (n === 200 || n === 304 || n === 403) return String(n);
  return '200';
}

/**
 * 异步记一笔 CSS 投递（失败不影响响应）。
 * 按 subject×day×domain×family×weight×status 累加 count 与 bytes。
 */
export async function recordDeliveryUsage(input: DeliveryUsageInput): Promise<void> {
  const domain = String(input.domain || 'unknown').trim().toLowerCase() || 'unknown';
  const family = normalizeFamilyParam(input.family);
  const weight = normalizeWeightParam(input.weight || 'regular');
  const status = normalizeStatusParam(input.status ?? 200);
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
          weight,
          status,
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
            eq(apiUsageDelivery.family, family),
            eq(apiUsageDelivery.weight, weight),
            eq(apiUsageDelivery.status, status)
          )
        );
    });
  } catch (error) {
    logger.warn('[usage-delivery] record failed', {
      domain,
      family,
      weight,
      status,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
