import { NextResponse } from 'next/server';
import {
  PROJECT_API_CORS,
  jsonOk,
  mapServiceError,
  withProjectOwnerAuth,
} from '@/lib/api/project-owner-auth';
import { consoleFontCertsService } from '@/lib/services/console-font-certs.service';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PROJECT_API_CORS });
}

type Ctx = { params: Promise<{ id: string }> };

/** PUT /api/font-certs/:id/file — 上传 PDF/图片证明。 */
export async function PUT(request: Request, ctx: Ctx) {
  return withProjectOwnerAuth(async (req, apiKey) => {
    try {
      const { id } = await ctx.params;
      const bytes = Buffer.from(await req.arrayBuffer());
      const filename =
        req.headers.get('x-file-name') ||
        req.headers.get('x-filename') ||
        'proof.bin';
      const contentType = req.headers.get('content-type') || '';
      const cert = consoleFontCertsService.putFile({
        apiKeyRaw: apiKey,
        id: decodeURIComponent(id),
        bytes,
        filename: decodeURIComponent(filename),
        contentType,
      });
      return jsonOk(cert);
    } catch (error) {
      return mapServiceError(error);
    }
  })(request);
}
