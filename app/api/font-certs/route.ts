import { NextResponse } from 'next/server';
import {
  PROJECT_API_CORS,
  jsonErr,
  jsonOk,
  mapServiceError,
  withProjectOwnerAuth,
} from '@/lib/api/project-owner-auth';
import { consoleFontCertsService } from '@/lib/services/console-font-certs.service';
import { ZodError } from 'zod';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PROJECT_API_CORS });
}

/** GET /api/font-certs — 本 Key 证书工单；?approved=1 仅返回已通过 fontKey 列表。 */
export const GET = withProjectOwnerAuth(async (request, apiKey) => {
  try {
    const url = new URL(request.url);
    if (url.searchParams.get('approved') === '1' || url.searchParams.get('grants') === '1') {
      return jsonOk({
        fontKeys: consoleFontCertsService.listApprovedKeys(apiKey),
        certs: consoleFontCertsService
          .list(apiKey)
          .filter((c) => c.status === 'approved'),
      });
    }
    return jsonOk(consoleFontCertsService.list(apiKey));
  } catch (error) {
    return mapServiceError(error);
  }
});

/** POST /api/font-certs — 提交证书工单（pending）。 */
export const POST = withProjectOwnerAuth(async (request, apiKey) => {
  try {
    const body = await request.json().catch(() => ({}));
    return jsonOk(consoleFontCertsService.create(apiKey, body), 201);
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonErr('validation_error', error.issues[0]?.message || '参数无效', 422);
    }
    return mapServiceError(error);
  }
});
