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

export const GET = withProjectOwnerAuth(async (request, apiKey) => {
  try {
    const q = new URL(request.url).searchParams.get('q') || undefined;
    return jsonOk(consoleProjectService.list(apiKey, q));
  } catch (error) {
    return mapServiceError(error);
  }
});

export const POST = withProjectOwnerAuth(async (request, apiKey) => {
  try {
    const body = (await request.json().catch(() => ({}))) as { name?: string };
    const name = String(body.name || '').trim();
    if (!name) return jsonErr('validation_error', '项目名称不能为空', 422);
    return jsonOk(consoleProjectService.create(apiKey, name), 201);
  } catch (error) {
    return mapServiceError(error);
  }
});
