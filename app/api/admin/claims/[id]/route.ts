import { handleApiError, withAdmin } from '@/lib/auth/api-guard';
import { consoleClaimsService } from '@/lib/services/console-claims.service';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/admin/claims/:id  body: { status: approved|rejected, reviewNote? } */
export const PATCH = withAdmin(async (req: NextRequest, session, context?: Ctx) => {
  try {
    const params = await context?.params;
    const id = String(params?.id || '').trim();
    if (!id) {
      return NextResponse.json({ code: 422, message: '缺少工单 id' }, { status: 422 });
    }
    const body = await req.json().catch(() => ({}));
    const result = consoleClaimsService.review(id, body, { email: session.user?.email });
    return NextResponse.json({
      code: 200,
      data: result,
      message: result.claim.status === 'approved' ? '已通过并回写认领状态' : '已拒绝',
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { code: 422, message: error.issues[0]?.message || '参数无效' },
        { status: 422 }
      );
    }
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
