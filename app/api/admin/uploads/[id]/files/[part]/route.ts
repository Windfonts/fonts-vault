import { handleApiError, withAdmin } from '@/lib/auth/api-guard';
import { consoleUploadsService } from '@/lib/services/console-uploads.service';
import { NextRequest, NextResponse } from 'next/server';

type Ctx = { params: Promise<{ id: string; part: string }> };

/** GET /api/admin/uploads/:id/files/:part — download local blob (weight or proof) */
export const GET = withAdmin(async (_req: NextRequest, _session, context?: Ctx) => {
  try {
    const params = await context?.params;
    const id = String(params?.id || '').trim();
    const part = String(params?.part || '').trim();
    if (!id || !part) {
      return NextResponse.json({ code: 422, message: '缺少 id 或 part' }, { status: 422 });
    }
    const file = consoleUploadsService.readBlob(id, part);
    return new NextResponse(new Uint8Array(file.bytes), {
      status: 200,
      headers: {
        'Content-Type': file.contentType,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
        'Cache-Control': 'no-store',
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
