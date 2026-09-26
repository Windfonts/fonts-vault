import { NextResponse } from 'next/server';
import {
  PROJECT_API_CORS,
  jsonErr,
  jsonOk,
  mapServiceError,
  withProjectOwnerAuth,
} from '@/lib/api/project-owner-auth';
import { consoleClaimsService } from '@/lib/services/console-claims.service';
import { ZodError } from 'zod';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PROJECT_API_CORS });
}

/** GET /api/claims — 本 Key 的认领工单列表。 */
export const GET = withProjectOwnerAuth(async (_request, apiKey) => {
  try {
    return jsonOk(consoleClaimsService.list(apiKey));
  } catch (error) {
    return mapServiceError(error);
  }
});

/**
 * POST /api/claims — 提交认领工单（pending）。
 * 审核回写 foundries.json / claimed 仍走运营后台，本接口只收单。
 */
export const POST = withProjectOwnerAuth(async (request, apiKey) => {
  try {
    const body = await request.json().catch(() => ({}));
    return jsonOk(consoleClaimsService.create(apiKey, body), 201);
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonErr('validation_error', error.issues[0]?.message || '参数无效', 422);
    }
    return mapServiceError(error);
  }
});
