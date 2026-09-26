import { recordDeliveryUsage } from '@/lib/api/usage-delivery';
import { db } from '@/lib/db/client';
import { apiKeys } from '@/lib/db/schema';
import { projectService } from '@/lib/services/project.service';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, If-None-Match',
  'Access-Control-Max-Age': '86400',
};

type RouteCtx = { params: Promise<{ slug: string; file: string }> };

async function resolveOwnerKeyId(ownerKeyHash: string | null | undefined): Promise<string | null> {
  const hash = String(ownerKeyHash || '').trim();
  if (!hash) return null;
  const row = await db
    .select({ id: apiKeys.id })
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, hash))
    .limit(1);
  return row[0]?.id ?? null;
}

/**
 * GET /p/{slug}/index.css
 * 项目烘焙 CSS：多字体 + 设置已展开；按清单域名校验 Referer/Origin。
 * 对外经 CDN（cn|hk|en.windfonts.com），边缘须把 /p/ 回源 vault（同 /api/css）。
 */
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PUBLIC_CORS });
}

export async function GET(request: NextRequest, ctx: RouteCtx) {
  const { slug, file } = await ctx.params;
  if (file !== 'index.css') {
    return NextResponse.json(
      { code: 404, message: '仅支持 index.css', status: 'fail' },
      { status: 404, headers: PUBLIC_CORS }
    );
  }

  const manifest = projectService.load(slug);
  if (!manifest) {
    return NextResponse.json(
      { code: 404, message: `项目 ${slug} 未发布`, status: 'fail' },
      { status: 404, headers: PUBLIC_CORS }
    );
  }

  const host = projectService.hostFromRequest(request);
  const day = new Date().toISOString().slice(0, 10);
  const ownerKeyId = await resolveOwnerKeyId(manifest.ownerKeyHash);

  if (!projectService.isHostAllowed(manifest, host)) {
    void recordDeliveryUsage({
      day,
      subject: ownerKeyId || 'anon',
      keyId: ownerKeyId,
      domain: host || 'unknown',
      family: `project:${manifest.slug}`,
      weight: 'index',
      status: 403,
      bytes: 0,
    });
    return new NextResponse('Forbidden: domain not allowlisted for this project', {
      status: 403,
      headers: {
        ...PUBLIC_CORS,
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }

  try {
    const { css, etag } = await projectService.bakeCss(manifest);
    const ifNoneMatch = request.headers.get('if-none-match');
    const subject = ownerKeyId || 'anon';
    if (ifNoneMatch === etag) {
      void recordDeliveryUsage({
        day,
        subject,
        keyId: ownerKeyId,
        domain: host || 'unknown',
        family: `project:${manifest.slug}`,
        weight: 'index',
        status: 304,
        bytes: 0,
      });
      return new NextResponse(null, {
        status: 304,
        headers: {
          ...PUBLIC_CORS,
          ETag: etag,
          'Cache-Control': 'public, max-age=300, s-maxage=600',
        },
      });
    }
    const bytes = Buffer.byteLength(css, 'utf8');
    void recordDeliveryUsage({
      day,
      subject,
      keyId: ownerKeyId,
      domain: host || 'unknown',
      family: `project:${manifest.slug}`,
      weight: 'index',
      status: 200,
      bytes,
    });
    return new NextResponse(css, {
      status: 200,
      headers: {
        ...PUBLIC_CORS,
        'Content-Type': 'text/css; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=600',
        ETag: etag,
        Vary: 'Accept-Encoding, Origin, Referer',
        'X-Windfonts-Project': `${manifest.slug};v=${manifest.version}`,
        'Content-Length': String(bytes),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'bake failed';
    return NextResponse.json(
      { code: 500, message, status: 'fail' },
      { status: 500, headers: PUBLIC_CORS }
    );
  }
}
