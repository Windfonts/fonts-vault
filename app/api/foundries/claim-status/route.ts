import { consoleClaimsService } from '@/lib/services/console-claims.service';
import { NextResponse } from 'next/server';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  'Cache-Control': 'public, max-age=60',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/**
 * GET /api/foundries/claim-status
 * 公开覆盖层：审核通过的 slug → claimed。前台合并进 foundries.json，避免部署冲掉手工字典。
 */
export async function GET() {
  const status = consoleClaimsService.claimStatusMap();
  return NextResponse.json(
    { ok: true, data: { updatedAt: status.updatedAt, bySlug: status.bySlug } },
    { headers: CORS }
  );
}
