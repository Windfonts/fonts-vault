import {
  PROJECT_API_CORS,
  jsonOk,
  withProjectOwnerAuth,
} from '@/lib/api/project-owner-auth';
import { NextResponse } from 'next/server';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PROJECT_API_CORS });
}

/** GET /api/usage/series — 与 /api/usage 同空壳，只返回 series。 */
export const GET = withProjectOwnerAuth(async (request) => {
  const sp = new URL(request.url).searchParams;
  const range = Math.min(90, Math.max(1, Number(sp.get('range') || 30) || 30));
  const to = new Date();
  const from = new Date(to.getTime() - (range - 1) * 864e5);
  const ymd = (d: Date) => d.toISOString().slice(0, 10);
  const requests: Array<{ day: string; requests: number; bytes: number }> = [];
  for (let i = 0; i < range; i += 1) {
    const d = new Date(from.getTime() + i * 864e5);
    requests.push({ day: ymd(d), requests: 0, bytes: 0 });
  }
  return jsonOk({ from: ymd(from), to: ymd(to), requests, stub: true });
});
