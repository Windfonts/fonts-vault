import { handleApiError, withAdmin } from '@/lib/auth/api-guard';
import { consoleFontCertsService } from '@/lib/services/console-font-certs.service';
import { NextRequest, NextResponse } from 'next/server';

/** GET /api/admin/font-certs?status=pending */
export const GET = withAdmin(async (req: NextRequest) => {
  try {
    const status = req.nextUrl.searchParams.get('status') || undefined;
    const filter =
      status === 'pending' || status === 'approved' || status === 'rejected'
        ? { status: status as 'pending' | 'approved' | 'rejected' }
        : undefined;
    const data = consoleFontCertsService.listAll(filter);
    return NextResponse.json({ code: 200, data, message: 'ok' });
  } catch (error) {
    return handleApiError(error);
  }
});
