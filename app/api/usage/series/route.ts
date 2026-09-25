import { NextResponse } from 'next/server';
import {
  PROJECT_API_CORS,
  jsonOk,
  mapServiceError,
  withProjectOwnerAuth,
} from '@/lib/api/project-owner-auth';
import { consoleUsageService } from '@/lib/services/console-usage.service';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PROJECT_API_CORS });
}

/** GET /api/usage/series — 每日请求序列。 */
export const GET = withProjectOwnerAuth(async (request, apiKey) => {
  try {
    const sp = new URL(request.url).searchParams;
    const range = Number(sp.get('range') || 30);
    const projectId = sp.get('projectId') || undefined;
    return jsonOk(await consoleUsageService.series(apiKey, { range, projectId }));
  } catch (error) {
    return mapServiceError(error);
  }
});
