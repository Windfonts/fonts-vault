import {
  PROJECT_API_CORS,
  jsonOk,
  mapServiceError,
  withProjectOwnerAuth,
} from '@/lib/api/project-owner-auth';
import { consoleProjectService } from '@/lib/services/console-project.service';
import { NextResponse } from 'next/server';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PROJECT_API_CORS });
}

type Ctx = { params: Promise<{ id: string; host: string }> };

export async function DELETE(request: Request, ctx: Ctx) {
  return withProjectOwnerAuth(async (_req, apiKey) => {
    try {
      const { id, host } = await ctx.params;
      consoleProjectService.removeDomain(apiKey, decodeURIComponent(id), decodeURIComponent(host));
      return jsonOk({ ok: true });
    } catch (error) {
      return mapServiceError(error);
    }
  })(request);
}
