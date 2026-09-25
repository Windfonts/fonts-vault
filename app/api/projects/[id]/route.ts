import {
  PROJECT_API_CORS,
  jsonOk,
  jsonErr,
  mapServiceError,
  withProjectOwnerAuth,
} from '@/lib/api/project-owner-auth';
import { consoleProjectService } from '@/lib/services/console-project.service';
import { NextResponse } from 'next/server';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PROJECT_API_CORS });
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  return withProjectOwnerAuth(async (_req, apiKey) => {
    try {
      const { id } = await ctx.params;
      const p = consoleProjectService.get(apiKey, decodeURIComponent(id));
      if (!p) return jsonErr('not_found', '项目不存在', 404);
      return jsonOk(p);
    } catch (error) {
      return mapServiceError(error);
    }
  })(request);
}

export async function PATCH(request: Request, ctx: Ctx) {
  return withProjectOwnerAuth(async (req, apiKey) => {
    try {
      const { id } = await ctx.params;
      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      return jsonOk(consoleProjectService.patch(apiKey, decodeURIComponent(id), body));
    } catch (error) {
      return mapServiceError(error);
    }
  })(request);
}

export async function DELETE(request: Request, ctx: Ctx) {
  return withProjectOwnerAuth(async (_req, apiKey) => {
    try {
      const { id } = await ctx.params;
      consoleProjectService.remove(apiKey, decodeURIComponent(id));
      return jsonOk({ ok: true });
    } catch (error) {
      return mapServiceError(error);
    }
  })(request);
}
