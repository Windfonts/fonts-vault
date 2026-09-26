import { NextResponse } from 'next/server';
import {
  PROJECT_API_CORS,
  jsonErr,
  jsonOk,
  mapServiceError,
  withProjectOwnerAuth,
} from '@/lib/api/project-owner-auth';
import { consoleFavsService } from '@/lib/services/console-favs.service';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PROJECT_API_CORS });
}

/** GET /api/favs — 字体/厂商收藏（按 API Key 隔离）。 */
export const GET = withProjectOwnerAuth(async (_request, apiKey) => {
  try {
    return jsonOk(consoleFavsService.get(apiKey));
  } catch (error) {
    return mapServiceError(error);
  }
});

/** PUT /api/favs — 全量覆盖 `{ fonts, authors }`。 */
export const PUT = withProjectOwnerAuth(async (request, apiKey) => {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      fonts?: unknown;
      authors?: unknown;
    };
    if (body.fonts !== undefined && !Array.isArray(body.fonts)) {
      return jsonErr('validation_error', 'fonts 须为数组', 422);
    }
    if (body.authors !== undefined && !Array.isArray(body.authors)) {
      return jsonErr('validation_error', 'authors 须为数组', 422);
    }
    return jsonOk(
      consoleFavsService.put(apiKey, {
        fonts: body.fonts ?? [],
        authors: body.authors ?? [],
      })
    );
  } catch (error) {
    return mapServiceError(error);
  }
});
