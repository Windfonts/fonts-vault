import { NextResponse } from 'next/server';
import {
  PROJECT_API_CORS,
  jsonOk,
  mapServiceError,
  withProjectOwnerAuth,
} from '@/lib/api/project-owner-auth';
import { consoleUploadsService } from '@/lib/services/console-uploads.service';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PROJECT_API_CORS });
}

/** GET /api/uploads — 当前 Key 的上传队列。 */
export const GET = withProjectOwnerAuth(async (_request, apiKey) => {
  try {
    return jsonOk(consoleUploadsService.list(apiKey));
  } catch (error) {
    return mapServiceError(error);
  }
});
