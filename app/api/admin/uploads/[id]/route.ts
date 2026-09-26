import { handleApiError, withAdmin } from '@/lib/auth/api-guard';
import { consoleUploadsService } from '@/lib/services/console-uploads.service';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/admin/uploads/:id  body: { status: approved|rejected, reviewNote? } */
export const PATCH = withAdmin(async (req: NextRequest, session, context?: Ctx) => {
  try {
    const params = await context?.params;
    const id = String(params?.id || '').trim();
    if (!id) {
      return NextResponse.json({ code: 422, message: '缺少上传 id' }, { status: 422 });
    }
    const body = await req.json().catch(() => ({}));
    const result = await consoleUploadsService.review(id, body, {
      email: session.user?.email,
    });
    return NextResponse.json({
      code: 200,
      data: result,
      message:
        result.upload.status === 'ready'
          ? result.ossPushed
            ? '已通过并推 OSS'
            : '已通过（OSS 未配置或跳过）'
          : '已拒绝',
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
