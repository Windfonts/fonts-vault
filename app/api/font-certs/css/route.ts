import { NextResponse } from 'next/server';
import {
  PROJECT_API_CORS,
  bearerOrApiKey,
  jsonErr,
} from '@/lib/api/project-owner-auth';
import { consoleFontCertsService } from '@/lib/services/console-font-certs.service';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PROJECT_API_CORS });
}

const PREVIEW: Record<string, Record<string, { url: string; weight: string }>> = {
  jlyhmht: {
    light: { url: '/assets/fonts/preview/Jlyhmht-Light.woff2', weight: '300' },
    regular: { url: '/assets/fonts/preview/Jlyhmht-Regular.woff2', weight: '400' },
    bold: { url: '/assets/fonts/preview/Jlyhmht-Bold.woff2', weight: '700' },
  },
  shmgt: {
    regular: { url: '/assets/fonts/preview/Shmgt-Regular.woff2', weight: '400' },
  },
};

function publicAppBase(): string {
  return (
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://app.windfonts.com'
  ).replace(/\/$/, '');
}

/**
 * GET /api/font-certs/css?family=wenfeng-jlyhmht&weight=regular
 * 账号作用域：须 Bearer API Key 且该字有 approved 证书。
 * 现用站内 preview woff2（不进 fonts-packages）。
 */
export async function GET(request: Request) {
  try {
    const apiKey = bearerOrApiKey(request);
    if (!apiKey) {
      return jsonErr('unauthorized', '需要 API Key', 401);
    }
    const url = new URL(request.url);
    const family = String(url.searchParams.get('family') || '').trim().toLowerCase();
    const weight = String(url.searchParams.get('weight') || 'regular')
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, '');
    const key = family.replace(/^wenfeng-/, '').replace(/^windfonts-/, '');
    if (!key || !consoleFontCertsService.hasApprovedGrant(apiKey, key)) {
      return jsonErr('forbidden', '未获该字体引用授权', 403);
    }
    const faces = PREVIEW[key];
    if (!faces) {
      return jsonErr('not_found', '无预览面可用（cite-closed 尚未配置 preview）', 404);
    }
    const face = faces[weight] || faces.regular || Object.values(faces)[0];
    if (!face) {
      return jsonErr('not_found', '无该字重预览面', 404);
    }
    const abs = publicAppBase() + face.url;
    const famCss = family.startsWith('wenfeng-') ? family : `wenfeng-${key}`;
    const css =
      `/* windfonts cert-grant · ${key} · preview-backed · not fonts-packages */\n` +
      `@font-face{font-family:${JSON.stringify(famCss)};font-style:normal;` +
      `font-weight:${face.weight};font-display:swap;` +
      `src:url(${JSON.stringify(abs)}) format("woff2");}\n`;
    return new NextResponse(css, {
      status: 200,
      headers: {
        ...PROJECT_API_CORS,
        'Content-Type': 'text/css; charset=utf-8',
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (error) {
    const e = error as { status?: number; message?: string; code?: string };
    return jsonErr(e.code || 'internal', e.message || 'css failed', e.status || 500);
  }
}
