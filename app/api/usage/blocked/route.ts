import {
  PROJECT_API_CORS,
  jsonOk,
  withProjectOwnerAuth,
} from '@/lib/api/project-owner-auth';
import { NextResponse } from 'next/server';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PROJECT_API_CORS });
}

/** GET /api/usage/blocked — 未授权访问列表（暂空）。 */
export const GET = withProjectOwnerAuth(async () => {
  return jsonOk([]);
});
