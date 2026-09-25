import { createHash } from 'crypto';
import { isWellFormedApiKey, withFontApiAuth } from '@/lib/api/font-api-auth';
import { NextResponse } from 'next/server';

export const PROJECT_API_CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  'Access-Control-Max-Age': '86400',
};

export function jsonOk(data: unknown, status = 200) {
  return NextResponse.json({ ok: true, data }, { status, headers: PROJECT_API_CORS });
}

export function jsonErr(code: string, message: string, status: number) {
  return NextResponse.json(
    { ok: false, error: { code, message } },
    { status, headers: PROJECT_API_CORS }
  );
}

export function bearerOrApiKey(request: Request): string | null {
  const fromX = request.headers.get('x-api-key')?.trim();
  if (fromX) return fromX;
  const auth = request.headers.get('authorization') || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || null;
}

function allowClientKey(): boolean {
  const v = process.env.PROJECT_PUBLISH_ALLOW_CLIENT;
  if (v === '0' || v === 'false') return false;
  return true;
}

function envPublishKey(): string {
  return String(process.env.PROJECT_PUBLISH_KEY || '').trim();
}

export function ownerKeyHash(raw: string): string {
  return createHash('sha256').update(String(raw || '').trim()).digest('hex');
}

type Handler = (request: Request, apiKeyRaw: string) => Promise<Response> | Response;

/**
 * 控制台项目 CRUD 鉴权：与 publish 同策略。
 * - PROJECT_PUBLISH_KEY
 * - 形态正确的自签 Key（默认允许）
 * - 库内已登记 API Key
 */
export function withProjectOwnerAuth(handler: Handler) {
  return async (request: Request): Promise<Response> => {
    const headerKey = bearerOrApiKey(request) || '';
    const envKey = envPublishKey();

    if (envKey && headerKey && headerKey === envKey) {
      return handler(request, headerKey);
    }

    if (allowClientKey() && headerKey && isWellFormedApiKey(headerKey)) {
      return handler(request, headerKey);
    }

    const guarded = withFontApiAuth(
      async (req, ctx) => {
        const raw = bearerOrApiKey(req);
        if (!ctx.apiKey || !raw) {
          return jsonErr('unauthorized', '需要有效 API Key', 401);
        }
        return handler(req, raw);
      },
      { requireKey: true }
    );

    return guarded(request);
  };
}

export function mapServiceError(error: unknown): Response {
  if (error && typeof error === 'object') {
    const e = error as { status?: number; code?: string; message?: string };
    if (e.status && e.message) {
      return jsonErr(e.code || 'internal', e.message, e.status);
    }
  }
  const message = error instanceof Error ? error.message : 'internal error';
  return jsonErr('internal', message, 500);
}
