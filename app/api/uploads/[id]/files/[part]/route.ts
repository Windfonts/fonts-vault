import { consoleUploadsService } from '@/lib/services/console-uploads.service';
import { NextResponse } from 'next/server';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Upload-Token, Authorization, X-API-Key',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

type Ctx = { params: Promise<{ id: string; part: string }> };

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
