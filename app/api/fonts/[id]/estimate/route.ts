import { withFontApiAuth } from '@/lib/api/font-api-auth';
import { handleApiError } from '@/lib/auth/api-guard';
import { fontService } from '@/lib/services/font.service';
import { getPackageSize } from '@/lib/services/package-size.service';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/fonts/[id]/estimate?subset=&weight=
 * P3：返回预计算 CSS 体积（Content-Length 清单），不含分片合计。
 */
const handleGet = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const subsetRaw = (req.nextUrl.searchParams.get('subset') || 'full').toLowerCase();
    const subset = (['en', 'zh-common', 'zh', 'full'].includes(subsetRaw)
      ? subsetRaw
      : 'full') as 'en' | 'zh-common' | 'zh' | 'full';

    let font = await fontService.findByNormalizedName(id);
    if (!font) {
      const byFamily = await fontService.findByFontFamily(id);
      if (byFamily?.length) {
        font = byFamily.find((f) => f.status === 'published') || byFamily[0];
      }
    }
    if (!font) font = await fontService.findById(id);
    if (!font) {
      return NextResponse.json(
        { code: 404, message: '字体不存在', status: 'fail' },
        { status: 404 }
      );
    }

    const keys = [
      font.normalizedName,
      font.fontFamily,
      String(font.fontFamily || '')
        .toLowerCase()
        .replace(/^wenfeng-/, ''),
    ].filter(Boolean) as string[];

    const size = getPackageSize(keys, subset);
    if (!size) {
      return NextResponse.json(
        {
          code: 404,
          message: '尚无包体清单',
          status: 'fail',
          data: { normalizedName: font.normalizedName, subset },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      code: 200,
      data: {
        normalizedName: font.normalizedName,
        fontFamily: font.fontFamily,
        subset: size.subset,
        weight: size.weight,
        cssBytes: size.cssBytes,
        note: '仅 CSS 档 Content-Length；分片 woff2 另计',
        source: size.source,
      },
      message: 'ok',
    });
  } catch (error) {
    return handleApiError(error, { url: req.url, method: req.method });
  }
};

export const GET = async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const wrapped = withFontApiAuth((request) => handleGet(request as NextRequest, ctx));
  return wrapped(req);
};
