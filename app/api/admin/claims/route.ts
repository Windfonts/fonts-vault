import { handleApiError, withAdmin } from '@/lib/auth/api-guard';
import { consoleClaimsService } from '@/lib/services/console-claims.service';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

/** GET /api/admin/claims?status=pending|approved|rejected */
export const GET = withAdmin(async (req: NextRequest) => {
  try {
    const raw = req.nextUrl.searchParams.get('status') || '';
    const filter =
      raw === 'pending' || raw === 'approved' || raw === 'rejected'
        ? { status: raw as 'pending' | 'approved' | 'rejected' }
        : undefined;
    const list = consoleClaimsService.listAll(filter);
    return NextResponse.json({ code: 200, data: list, message: 'ok' });
  } catch (error) {
    return handleApiError(error);
  }
});
