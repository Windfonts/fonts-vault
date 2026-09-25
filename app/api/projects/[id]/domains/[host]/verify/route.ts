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

type Ctx = { params: Promise<{ id: string; host: string }> };

/** POST：开始验证（当前实现直接通过，与控制台 mock 行为对齐；后续可接 DNS 探测） */
export async function POST(request: Request, ctx: Ctx) {
  return withProjectOwnerAuth(async (_req, apiKey) => {
    try {
      const { id, host } = await ctx.params;
      const d = consoleProjectService.verifyDomain(
        apiKey,
        decodeURIComponent(id),
        decodeURIComponent(host)
      );
      return jsonOk({
        status: 'verified',
        verified: true,
        method: d.method || 'dns',
        checkAfterSec: 0,
        checkedAt: d.verifiedAt || new Date().toISOString(),
        detail: '',
      });
    } catch (error) {
      return mapServiceError(error);
    }
  })(request);
}

/** GET：轮询验证状态 */
export async function GET(request: Request, ctx: Ctx) {
  return withProjectOwnerAuth(async (_req, apiKey) => {
    try {
      const { id, host } = await ctx.params;
      const domains = consoleProjectService.listDomains(apiKey, decodeURIComponent(id));
      const h = decodeURIComponent(host).toLowerCase();
      const d = domains.find((x) => x.host === h);
      if (!d) {
        return mapServiceError(Object.assign(new Error('域名不存在'), { status: 404, code: 'not_found' }));
      }
      if (!d.verified) {
        const verified = consoleProjectService.verifyDomain(apiKey, decodeURIComponent(id), h);
        return jsonOk({
          status: 'verified',
          verified: true,
          method: verified.method || 'dns',
          checkedAt: verified.verifiedAt || new Date().toISOString(),
          detail: '',
        });
      }
      return jsonOk({
        status: 'verified',
        verified: true,
        method: d.method || 'dns',
        checkedAt: d.verifiedAt || new Date().toISOString(),
        detail: '',
      });
    } catch (error) {
      return mapServiceError(error);
    }
  })(request);
}
