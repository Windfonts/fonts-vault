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

export const GET = withProjectOwnerAuth(async (_request, apiKey) => {
  try {
    return jsonOk(consoleProjectService.listAllDomains(apiKey));
  } catch (error) {
    return mapServiceError(error);
  }
});
