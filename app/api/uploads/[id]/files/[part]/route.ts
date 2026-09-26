import { consoleUploadsService } from '@/lib/services/console-uploads.service';
import { projectService } from '@/lib/services/project.service';
import { NextResponse } from 'next/server';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, X-Upload-Token, Authorization, X-API-Key, Origin, Referer',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

type Ctx = { params: Promise<{ id: string; part: string }> };

/**
 * GET /api/uploads/:id/files/:part?p={slug}
 * 项目烘焙 CSS 引用的自有字文件。须 ready，且清单含此 uploadId；域名校验同 /p/。
 */
export async function GET(request: Request, ctx: Ctx) {
  try {
    const { id, part } = await ctx.params;
    const uploadId = decodeURIComponent(id);
    const weightPart = decodeURIComponent(part);
    if (weightPart === 'proof') {
      return NextResponse.json(
        { ok: false, error: { code: 'forbidden', message: '证明文件不可公开拉取' } },
        { status: 403, headers: CORS }
      );
    }

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

    const file = consoleUploadsService.readReadyBlob(uploadId, weightPart);
    return new NextResponse(new Uint8Array(file.bytes), {
      status: 200,
      headers: {
        ...CORS,
        'Content-Type': file.contentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=300, s-maxage=600',
        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
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

/**
 * PUT /api/uploads/:id/files/:part
 * part = 字重名 或 proof。鉴权：X-Upload-Token（init 下发）。
 */
export async function PUT(request: Request, ctx: Ctx) {
  try {
    const { id, part } = await ctx.params;
    const token =
      request.headers.get('x-upload-token') ||
      new URL(request.url).searchParams.get('token') ||
      '';
    const buf = Buffer.from(await request.arrayBuffer());
    const result = consoleUploadsService.putFile({
      uploadId: decodeURIComponent(id),
      part: decodeURIComponent(part),
      token,
      bytes: buf,
      contentType: request.headers.get('content-type') || undefined,
    });
    return NextResponse.json({ ok: true, data: result }, { status: 200, headers: CORS });
  } catch (error) {
    const e = error as { status?: number; code?: string; message?: string };
    const status = e.status || 500;
    return NextResponse.json(
      {
        ok: false,
        error: { code: e.code || 'internal', message: e.message || 'upload failed' },
      },
      { status, headers: CORS }
    );
  }
}
