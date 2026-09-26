import { handleApiError, withAdmin } from '@/lib/auth/api-guard';
import { consoleUploadsService } from '@/lib/services/console-uploads.service';
import { NextRequest, NextResponse } from 'next/server';

/** GET /api/admin/uploads?status=queued|ready|rejected|processing|pending_upload */
export const GET = withAdmin(async (req: NextRequest) => {
  try {
    const raw = req.nextUrl.searchParams.get('status') || '';
    const allowed = new Set([
      'queued',
      'ready',
      'rejected',
      'processing',
      'pending_upload',
    ]);
    const filter = allowed.has(raw)
      ? {
          status: raw as
            | 'queued'
            | 'ready'
            | 'rejected'
            | 'processing'
            | 'pending_upload',
        }
      : undefined;
    const list = consoleUploadsService.listAll(filter);
    return NextResponse.json({ code: 200, data: list, message: 'ok' });
  } catch (error) {
    return handleApiError(error);
  }
});
