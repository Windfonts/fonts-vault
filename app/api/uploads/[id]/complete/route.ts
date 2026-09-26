import {
  PROJECT_API_CORS,
  jsonOk,
  mapServiceError,
  withProjectOwnerAuth,
} from '@/lib/api/project-owner-auth';
import { consoleUploadsService } from '@/lib/services/console-uploads.service';
import { NextResponse } from 'next/server';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PROJECT_API_CORS });
}

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  return withProjectOwnerAuth(async (_req, apiKey) => {
    try {
      const { id } = await ctx.params;
      return jsonOk(consoleUploadsService.complete(apiKey, decodeURIComponent(id)));
    } catch (error) {
      return mapServiceError(error);
    }
  })(request);
}
