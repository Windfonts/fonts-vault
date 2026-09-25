import {
  PROJECT_API_CORS,
  jsonOk,
  withProjectOwnerAuth,
} from '@/lib/api/project-owner-auth';
import { NextResponse } from 'next/server';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PROJECT_API_CORS });
}

/**
 * GET /api/usage — 控制台用量总览。
 * 诚实空壳：聚合表尚未按 API Key 暴露；返回零值结构，避免前端 404。
 */
export const GET = withProjectOwnerAuth(async (request) => {
  const sp = new URL(request.url).searchParams;
  const range = Math.min(90, Math.max(1, Number(sp.get('range') || 30) || 30));
  const to = new Date();
  const from = new Date(to.getTime() - (range - 1) * 864e5);
  const ymd = (d: Date) => d.toISOString().slice(0, 10);
  const series: Array<{ day: string; requests: number; bytes: number }> = [];
  for (let i = 0; i < range; i += 1) {
    const d = new Date(from.getTime() + i * 864e5);
    series.push({ day: ymd(d), requests: 0, bytes: 0 });
  }
  return jsonOk({
    totals: { requests: 0, bytes: 0, blocked: 0, quotaGB: 200 },
    series: { from: ymd(from), to: ymd(to), requests: series },
    byFont: [],
    byDomain: [],
    status: { '200': 0, '304': 0, '403': 0 },
    groups: [],
    perf: [],
    stub: true,
  });
});
