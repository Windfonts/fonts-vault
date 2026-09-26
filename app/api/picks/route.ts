import { NextResponse } from 'next/server';
import {
  PROJECT_API_CORS,
  jsonErr,
  jsonOk,
  mapServiceError,
  withProjectOwnerAuth,
} from '@/lib/api/project-owner-auth';
import { consolePicksService } from '@/lib/services/console-picks.service';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PROJECT_API_CORS });
}

/**
 * GET /api/picks — 登录控制台选字袋（按 API Key 隔离）。
 */
export const GET = withProjectOwnerAuth(async (_request, apiKey) => {
  try {
    return jsonOk(consolePicksService.get(apiKey));
  } catch (error) {
    return mapServiceError(error);
  }
});

/**
 * PUT /api/picks — 全量覆盖选字袋 `{ items: [...] }`（最多 200）。
 */
export const PUT = withProjectOwnerAuth(async (request, apiKey) => {
  try {
    const body = (await request.json().catch(() => ({}))) as { items?: unknown };
    if (!Array.isArray(body.items)) {
      return jsonErr('validation_error', 'items 须为数组', 422);
    }
    return jsonOk(consolePicksService.put(apiKey, body.items));
  } catch (error) {
    return mapServiceError(error);
  }
});
