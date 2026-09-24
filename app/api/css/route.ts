import { withFontApiAuth } from '@/lib/api/font-api-auth';
import { logger } from '@/lib/logger';
import { cssService } from '@/lib/services/css.service';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * GET /api/css
 * 生成字体CSS（Google Fonts风格）
 *
 * 查询参数:
 * - family: 字体短码 / fontFamily（主款）
 * - weight / subset|lang
 * - fallback: 可选，谱系或简繁补全款；响应内补全 @font-face 仅含主款缺口 unicode-range
 * - fallbackWeight: 可选，补全款字重名；缺省按 font_weight 与主款对齐
 *
 * 响应:
 * - Content-Type: text/css
 * - Cache-Control: public, max-age=3600, s-maxage=7200
 * - ETag: 内容哈希
 *
 * 支持条件请求:
 * - If-None-Match: 如果ETag匹配，返回304
 */
export const GET = withFontApiAuth(
  async (request) => {
  const nextRequest = request as NextRequest;
  try {
    // 获取查询参数
    const searchParams = nextRequest.nextUrl.searchParams;
    const family = searchParams.get('family');
    const subset = searchParams.get('subset') || undefined;
    const lang = searchParams.get('lang') || undefined;

    // 验证必需参数
    if (!family) {
      return NextResponse.json(
        {
          code: 400,
          message: 'family参数不能为空',
          status: 'fail',
        },
        { status: 400 }
      );
    }

    // 生成CSS
    // 将 subset/lang 参数映射到 version
    const version = ((subset || lang || 'full').toLowerCase() || 'full') as
      | 'en'
      | 'zh'
      | 'zh-common'
      | 'full';
    const weight = (searchParams.get('weight') || 'regular').toLowerCase();
    const fallback = searchParams.get('fallback') || undefined;
    const fallbackWeight = searchParams.get('fallbackWeight') || undefined;
    const { css, etag } = await cssService.generateCSS({
      family,
      version,
      weight,
      fallback,
      fallbackWeight,
    });

    // 检查条件请求（If-None-Match）
    const ifNoneMatch = nextRequest.headers.get('if-none-match');
    if (ifNoneMatch === etag) {
      // 内容未变化，返回304
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          'Cache-Control': 'public, max-age=3600, s-maxage=7200',
        },
      });
    }

    // 返回CSS内容
    return new NextResponse(css, {
      status: 200,
      headers: {
        'Content-Type': 'text/css; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=7200',
        ETag: etag,
        Vary: 'Accept-Encoding',
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      logger.error('[API-css] 参数验证失败', {
        error: error.errors,
      });
      return NextResponse.json(
        {
          code: 400,
          message: '参数验证失败',
          status: 'fail',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes('不存在')) {
      logger.warn('[API-css] 字体不存在', {
        error: error.message,
      });
      return NextResponse.json(
        {
          code: 404,
          message: error.message,
          status: 'fail',
        },
        { status: 404 }
      );
    }

    logger.error('[API-css] 生成CSS失败', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        code: 500,
        message: '生成CSS失败',
        status: 'error',
      },
      { status: 500 }
    );
  }
},
  // 公开 CDN 投递：边缘回源常无 Origin；不可吃匿名日额度
  { skipAnonymousQuota: true }
);
