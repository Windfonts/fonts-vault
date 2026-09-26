import { handleApiError, withAdmin } from '@/lib/auth/api-guard';
import { consoleFontCertsService } from '@/lib/services/console-font-certs.service';
import { NextRequest, NextResponse } from 'next/server';

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/admin/font-certs/:id/file — 下载证明 PDF/图片 */
export const GET = withAdmin(async (_req: NextRequest, _session, context?: Ctx) => {
  try {
    const params = await context?.params;
    const id = String(params?.id || '').trim();
    if (!id) {
      return NextResponse.json({ code: 422, message: '缺少工单 id' }, { status: 422 });
    }
    const file = consoleFontCertsService.readProofBlob(id);
    return new NextResponse(new Uint8Array(file.bytes), {
      status: 200,
      headers: {
        'Content-Type': file.contentType,
        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    if (error && typeof error === 'object') {
      const e = error as { status?: number; code?: string; message?: string };
      if (e.status && e.message) {
        return NextResponse.json(
          { code: e.status, error: { code: e.code || 'error', message: e.message } },
          { status: e.status }
        );
      }
    }
    return handleApiError(error);
  }
});
