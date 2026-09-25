import { generateApiKey } from '@/lib/api/font-api-auth';
import { createHash } from 'crypto';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { apiKeys } from '@/lib/db/schema';
import {
  decryptConsoleKey,
  deleteConsoleSessionKey,
  encryptConsoleKey,
  readConsoleSessionKey,
  writeConsoleSessionKey,
} from '@/lib/services/console-session-key';
import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CONSOLE_KEY_NAME = 'console-sso';

type Body = {
  /** 浏览器现有钥；有效则认领/复用 */
  apiKey?: string;
  /** true 时吊销旧钥并签发新钥 */
  rotate?: boolean;
};

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin') || '';
  const allow =
    origin === 'https://app.windfonts.com' ||
    origin === 'https://staging-app.windfonts.com' ||
    origin.startsWith('http://127.0.0.1') ||
    origin.startsWith('http://localhost')
      ? origin
      : 'https://app.windfonts.com';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data: unknown, status: number, request: Request) {
  return NextResponse.json(data, { status, headers: corsHeaders(request) });
}

function ownerEmailFromSession(session: {
  user?: { email?: string | null; id?: string | null; name?: string | null };
}): string | null {
  const email = String(session.user?.email || '')
    .trim()
    .toLowerCase();
  if (email && email.includes('@')) return email;
  const id = String(session.user?.id || '').trim();
  if (id) return `user-${id}@windfonts.local`;
  return null;
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function isWellFormed(raw: string): boolean {
  const parts = String(raw || '').split('_');
  if (parts.length !== 4 || parts[0] !== 'wf') return false;
  if (!parts[1] || parts[1].length > 12) return false;
  if (!parts[2] || parts[2].length < 16) return false;
  if (!parts[3] || parts[3].length !== 4) return false;
  return true;
}

async function revokeConsoleKeysForEmail(email: string): Promise<void> {
  const now = new Date();
  await db
    .update(apiKeys)
    .set({ status: 'revoked', revokedAt: now, updatedAt: now })
    .where(and(eq(apiKeys.ownerEmail, email), eq(apiKeys.name, CONSOLE_KEY_NAME), eq(apiKeys.status, 'active')));
}

async function insertKey(opts: {
  email: string;
  plaintext: string;
  keyHash: string;
  checksum: string;
  keyPrefix: string;
}): Promise<string> {
  const now = new Date();
  const id = crypto.randomUUID();
  await db.insert(apiKeys).values({
    id,
    name: CONSOLE_KEY_NAME,
    keyPrefix: opts.keyPrefix,
    keyHash: opts.keyHash,
    checksum: opts.checksum,
    ownerEmail: opts.email,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });
  writeConsoleSessionKey({
    email: opts.email,
    keyHash: opts.keyHash,
    keyEnc: encryptConsoleKey(opts.plaintext),
    keyId: id,
    updatedAt: now.toISOString(),
  });
  return id;
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

/**
 * POST /api/console/ensure-key
 * Cookie 会话 → 返回/签发控制台 API Key（明文仅经此接口下发）。
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return json({ ok: false, error: { code: 'unauthorized', message: '请先登录' } }, 401, request);
    }
    const email = ownerEmailFromSession(session);
    if (!email) {
      return json(
        { ok: false, error: { code: 'validation_error', message: '会话缺少用户标识' } },
        422,
        request
      );
    }

    const body = (await request.json().catch(() => ({}))) as Body;
    const rotate = !!body.rotate;
    const presented = String(body.apiKey || '').trim();

    if (rotate) {
      await revokeConsoleKeysForEmail(email);
      deleteConsoleSessionKey(email);
      const generated = generateApiKey('live');
      const id = await insertKey({
        email,
        plaintext: generated.key,
        keyHash: generated.keyHash,
        checksum: generated.checksum,
        keyPrefix: generated.keyPrefix,
      });
      return json(
        {
          ok: true,
          data: {
            apiKey: generated.key,
            keyId: id,
            email,
            created: true,
            rotated: true,
          },
        },
        200,
        request
      );
    }

    if (presented && isWellFormed(presented)) {
      const hash = sha256Hex(presented);
      const rows = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, hash)).limit(1);
      if (rows.length) {
        const row = rows[0];
        if (row.status !== 'active') {
          /* fall through to recover/mint */
        } else if (row.ownerEmail && row.ownerEmail.toLowerCase() !== email) {
          return json(
            { ok: false, error: { code: 'forbidden', message: '该密钥已绑定其他账号' } },
            403,
            request
          );
        } else {
          if (!row.ownerEmail || row.name !== CONSOLE_KEY_NAME) {
            await db
              .update(apiKeys)
              .set({
                ownerEmail: email,
                name: CONSOLE_KEY_NAME,
                updatedAt: new Date(),
              })
              .where(eq(apiKeys.id, row.id));
          }
          writeConsoleSessionKey({
            email,
            keyHash: hash,
            keyEnc: encryptConsoleKey(presented),
            keyId: row.id,
            updatedAt: new Date().toISOString(),
          });
          return json(
            {
              ok: true,
              data: { apiKey: presented, keyId: row.id, email, created: false, reused: true },
            },
            200,
            request
          );
        }
      } else {
        /* 本机自签钥未入库：认领，保留项目 hash 归属 */
        const parts = presented.split('_');
        const id = await insertKey({
          email,
          plaintext: presented,
          keyHash: hash,
          checksum: parts[3].toUpperCase(),
          keyPrefix: parts[1],
        });
        return json(
          {
            ok: true,
            data: { apiKey: presented, keyId: id, email, created: true, claimed: true },
          },
          200,
          request
        );
      }
    }

    const stored = readConsoleSessionKey(email);
    if (stored?.keyEnc) {
      try {
        const plaintext = decryptConsoleKey(stored.keyEnc);
        const rows = await db
          .select()
          .from(apiKeys)
          .where(eq(apiKeys.keyHash, sha256Hex(plaintext)))
          .limit(1);
        if (rows.length && rows[0].status === 'active') {
          return json(
            {
              ok: true,
              data: {
                apiKey: plaintext,
                keyId: rows[0].id,
                email,
                created: false,
                restored: true,
              },
            },
            200,
            request
          );
        }
      } catch {
        deleteConsoleSessionKey(email);
      }
    }

    const generated = generateApiKey('live');
    const id = await insertKey({
      email,
      plaintext: generated.key,
      keyHash: generated.keyHash,
      checksum: generated.checksum,
      keyPrefix: generated.keyPrefix,
    });
    return json(
      {
        ok: true,
        data: { apiKey: generated.key, keyId: id, email, created: true },
      },
      200,
      request
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'internal error';
    return json({ ok: false, error: { code: 'internal', message } }, 500, request);
  }
}

/** GET：探测是否已有会话钥（不返回明文） */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return json({ ok: false, error: { code: 'unauthorized', message: '请先登录' } }, 401, request);
    }
    const email = ownerEmailFromSession(session);
    if (!email) {
      return json(
        { ok: false, error: { code: 'validation_error', message: '会话缺少用户标识' } },
        422,
        request
      );
    }
    const stored = readConsoleSessionKey(email);
    return json(
      {
        ok: true,
        data: {
          email,
          hasKey: !!stored,
          keyId: stored?.keyId || null,
          updatedAt: stored?.updatedAt || null,
        },
      },
      200,
      request
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'internal error';
    return json({ ok: false, error: { code: 'internal', message } }, 500, request);
  }
}
