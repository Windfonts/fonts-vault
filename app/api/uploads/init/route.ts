import { NextResponse } from 'next/server';
import {
  PROJECT_API_CORS,
  jsonOk,
  mapServiceError,
  withProjectOwnerAuth,
} from '@/lib/api/project-owner-auth';
import { consoleUploadsService } from '@/lib/services/console-uploads.service';
import { ZodError } from 'zod';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PROJECT_API_CORS });
}

function publicBase(request: Request): string {
  const env = (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
  if (env) return env;
  try {
    return new URL(request.url).origin;
  } catch {
    return 'https://app.windfonts.com';
  }
}

/** POST /api/uploads/init */
export const POST = withProjectOwnerAuth(async (request, apiKey) => {
  try {
    const body = await request.json().catch(() => ({}));
    return jsonOk(consoleUploadsService.init(apiKey, body, publicBase(request)));
  } catch (error) {
    if (error instanceof ZodError) {
      return mapServiceError(
        Object.assign(new Error(error.issues[0]?.message || '参数无效'), {
          status: 422,
          code: 'validation_error',
        })
      );
    }
    return mapServiceError(error);
  }
});
