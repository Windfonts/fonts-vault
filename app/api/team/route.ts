import { NextResponse } from 'next/server';
import {
  PROJECT_API_CORS,
  jsonErr,
  jsonOk,
  mapServiceError,
  withProjectOwnerAuth,
} from '@/lib/api/project-owner-auth';
import { consoleTeamService } from '@/lib/services/console-team.service';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PROJECT_API_CORS });
}

/** GET /api/team — 团队成员列表（按 API Key 隔离）。 */
export const GET = withProjectOwnerAuth(async (_request, apiKey) => {
  try {
    return jsonOk(consoleTeamService.list(apiKey));
  } catch (error) {
    return mapServiceError(error);
  }
});

/** PUT /api/team — 全量覆盖 `{ members }`。 */
export const PUT = withProjectOwnerAuth(async (request, apiKey) => {
  try {
    const body = (await request.json().catch(() => ({}))) as { members?: unknown };
    return jsonOk(consoleTeamService.put(apiKey, body));
  } catch (error) {
    return mapServiceError(error);
  }
});

/** POST /api/team — 邀请成员 `{ email, role?, name? }`。 */
export const POST = withProjectOwnerAuth(async (request, apiKey) => {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      email?: unknown;
      role?: unknown;
      name?: unknown;
    };
    if (!body.email) return jsonErr('validation_error', '邮箱不能为空', 422);
    return jsonOk(consoleTeamService.invite(apiKey, body), 201);
  } catch (error) {
    return mapServiceError(error);
  }
});
