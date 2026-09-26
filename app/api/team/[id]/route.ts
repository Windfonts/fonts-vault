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

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/team/:id — `{ role }` */
export async function PATCH(request: Request, ctx: Ctx) {
  return withProjectOwnerAuth(async (req, apiKey) => {
    try {
      const { id } = await ctx.params;
      const memberId = decodeURIComponent(String(id || '').trim());
      if (!memberId) return jsonErr('validation_error', '缺少成员 id', 422);
      const body = (await req.json().catch(() => ({}))) as { role?: unknown };
      return jsonOk(consoleTeamService.setRole(apiKey, memberId, body.role));
    } catch (error) {
      return mapServiceError(error);
    }
  })(request);
}

/** DELETE /api/team/:id */
export async function DELETE(request: Request, ctx: Ctx) {
  return withProjectOwnerAuth(async (_req, apiKey) => {
    try {
      const { id } = await ctx.params;
      const memberId = decodeURIComponent(String(id || '').trim());
      if (!memberId) return jsonErr('validation_error', '缺少成员 id', 422);
      return jsonOk(consoleTeamService.remove(apiKey, memberId));
    } catch (error) {
      return mapServiceError(error);
    }
  })(request);
}
