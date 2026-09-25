import { createHash } from 'crypto';
import { isWellFormedApiKey, withFontApiAuth } from '@/lib/api/font-api-auth';
import { logger } from '@/lib/logger';
import { projectService } from '@/lib/services/project.service';
import { projectManifestSchema } from '@/lib/services/validation';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

const PUBLISH_CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Project-Publish-Key',
  'Access-Control-Max-Age': '86400',
};

function publishOpen(): boolean {
  return process.env.PROJECT_PUBLISH_OPEN === '1' || process.env.PROJECT_PUBLISH_OPEN === 'true';
}

/** 默认开：接受校验和正确的自签 Key（不查库）；设 PROJECT_PUBLISH_ALLOW_CLIENT=0 关闭 */
function allowClientKey(): boolean {
  const v = process.env.PROJECT_PUBLISH_ALLOW_CLIENT;
  if (v === '0' || v === 'false') return false;
  return true;
}

function envPublishKey(): string {
  return String(process.env.PROJECT_PUBLISH_KEY || '').trim();
}

function keyHash(raw: string | null | undefined): string | null {
  const k = String(raw || '').trim();
  if (!k) return null;
  return createHash('sha256').update(k).digest('hex');
}

function bearerOrApiKey(request: Request): string | null {
  const fromX =
    request.headers.get('x-api-key')?.trim() ||
    request.headers.get('x-project-publish-key')?.trim();
  if (fromX) return fromX;
  const auth = request.headers.get('authorization') || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || null;
}

/**
 * POST /api/projects/publish
 * 写入 data/projects/{slug}.json。鉴权其一：
 * - X-Project-Publish-Key / Bearer 匹配 PROJECT_PUBLISH_KEY
 * - PROJECT_PUBLISH_OPEN=1
 * - 形态正确的自签 API Key（默认允许；ownerKeyHash 防他人覆盖）
 * - 库内已登记 API Key（withFontApiAuth requireKey）
 */
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PUBLISH_CORS });
}

async function handlePublish(request: Request, apiKeyRaw: string | null) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: 400, message: 'JSON body required', status: 'fail' },
      { status: 400, headers: PUBLISH_CORS }
    );
  }

  try {
    const parsed = projectManifestSchema.parse(body);
    const manifest = projectService.save(parsed, { ownerKeyHash: keyHash(apiKeyRaw) });
    logger.info('[projects/publish] ok', {
      slug: manifest.slug,
      version: manifest.version,
      fonts: manifest.fonts.length,
    });
    return NextResponse.json(
      {
        code: 0,
        status: 'ok',
        data: {
          slug: manifest.slug,
          version: manifest.version,
          publishedAt: manifest.publishedAt,
          url: `/p/${manifest.slug}/index.css`,
          fonts: manifest.fonts.length,
        },
      },
      { status: 200, headers: PUBLISH_CORS }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          code: 400,
          message: 'manifest invalid',
          status: 'fail',
          errors: error.flatten(),
        },
        { status: 400, headers: PUBLISH_CORS }
      );
    }
    const message = error instanceof Error ? error.message : 'publish failed';
    const status = /无权覆盖/.test(message) ? 403 : 500;
    return NextResponse.json(
      { code: status, message, status: 'fail' },
      { status, headers: PUBLISH_CORS }
    );
  }
}

export const POST = async (request: Request) => {
  const envKey = envPublishKey();
  const headerKey = bearerOrApiKey(request) || '';

  if (envKey && headerKey && headerKey === envKey) {
    return handlePublish(request, headerKey);
  }

  if (publishOpen()) {
    return handlePublish(request, headerKey || null);
  }

  if (allowClientKey() && headerKey && isWellFormedApiKey(headerKey)) {
    return handlePublish(request, headerKey);
  }

  const guarded = withFontApiAuth(
    async (req, ctx) => {
      const raw = bearerOrApiKey(req);
      if (!ctx.apiKey) {
        return NextResponse.json(
          { code: 401, message: '需要有效 API Key 才能发布项目', status: 'fail' },
          { status: 401, headers: PUBLISH_CORS }
        );
      }
      return handlePublish(req, raw);
    },
    { requireKey: true }
  );

  return guarded(request);
};
