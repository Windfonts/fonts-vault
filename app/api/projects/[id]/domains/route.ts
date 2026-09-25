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
      return jsonOk(consoleProjectService.listDomains(apiKey, decodeURIComponent(id)));
    } catch (error) {
      return mapServiceError(error);
    }
  })(request);
}

export async function POST(request: Request, ctx: Ctx) {
  return withProjectOwnerAuth(async (req, apiKey) => {
    try {
      const { id } = await ctx.params;
      const body = (await req.json().catch(() => ({}))) as { host?: string; method?: string };
      const host = String(body.host || '').trim();
      if (!host) return jsonErr('validation_error', '域名不能为空', 422);
      return jsonOk(
        consoleProjectService.addDomain(apiKey, decodeURIComponent(id), host, body.method || 'dns'),
        201
      );
    } catch (error) {
      return mapServiceError(error);
    }
  })(request);
}
