import { NextResponse } from 'next/server';
import {
  PROJECT_API_CORS,
  jsonOk,
  mapServiceError,
  withProjectOwnerAuth,
} from '@/lib/api/project-owner-auth';
import { consoleUsageService } from '@/lib/services/console-usage.service';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PROJECT_API_CORS });
}

/**
 * GET /api/usage — 控制台用量总览。
 * 聚合 api_usage_daily：本 Key 计数 + 项目白名单域名上的匿名流量。
 * 字节 / 按字体 / 状态码尚未采集（dimensions 标明）。
 */
export const GET = withProjectOwnerAuth(async (request, apiKey) => {
  try {
    const sp = new URL(request.url).searchParams;
    const range = Number(sp.get('range') || 30);
    const projectId = sp.get('projectId') || undefined;
    return jsonOk(await consoleUsageService.overview(apiKey, { range, projectId }));
  } catch (error) {
    return mapServiceError(error);
  }
});
