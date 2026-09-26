import { consoleUploadsService } from '@/lib/services/console-uploads.service';
import { projectService } from '@/lib/services/project.service';
import { NextResponse } from 'next/server';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-API-Key, Origin, Referer',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

type Ctx = {
  params: Promise<{ id: string; part: string; file: string }>;
};

/**
 * GET /api/uploads/:id/files/:part/shards/:file?p={slug}
 * cn-font-split 分片（N.woff2）。须 ready + 项目引用 + 域名白名单。
 */
export async function GET(request: Request, ctx: Ctx) {
  try {
    const { id, part, file } = await ctx.params;
    const uploadId = decodeURIComponent(id);
    const weightPart = decodeURIComponent(part);
    const shardFile = decodeURIComponent(file);

    const url = new URL(request.url);
    const slug = String(url.searchParams.get('p') || '').trim();
    if (!slug) {
      return NextResponse.json(
        { ok: false, error: { code: 'validation_error', message: '缺少项目参数 p' } },
        { status: 422, headers: CORS }
      );
    }

    const manifest = projectService.load(slug);
    if (!manifest) {
      return NextResponse.json(
        { ok: false, error: { code: 'not_found', message: `项目 ${slug} 未发布` } },
        { status: 404, headers: CORS }
      );
    }
    if (!projectService.projectUsesUpload(manifest, uploadId)) {
      return NextResponse.json(
        { ok: false, error: { code: 'forbidden', message: '该项目未引用此上传' } },
        { status: 403, headers: CORS }
      );
    }

    const host = projectService.hostFromRequest(request);
    if (!projectService.isHostAllowed(manifest, host)) {
      return new NextResponse('Forbidden: domain not allowlisted for this project', {
        status: 403,
        headers: {
          ...CORS,
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
    }

    const shard = consoleUploadsService.readSplitShard(uploadId, weightPart, shardFile);
    return new NextResponse(new Uint8Array(shard.bytes), {
      status: 200,
      headers: {
        ...CORS,
        'Content-Type': shard.contentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=300, s-maxage=600',
        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(shard.filename)}`,
        Vary: 'Origin, Referer',
      },
    });
  } catch (error) {
    const e = error as { status?: number; code?: string; message?: string };
    const status = e.status || 500;
    return NextResponse.json(
      {
        ok: false,
        error: { code: e.code || 'internal', message: e.message || 'read failed' },
      },
      { status, headers: CORS }
    );
  }
}
