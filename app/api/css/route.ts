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
 * - family: 字体名称（支持多个，用|分隔，例如：Noto Sans:400,700|Roboto:300）
 * - subset: 字体变体（可选）
 * - lang: 语言（可选，zh表示纯中文）
 *
 * 响应:
 * - Content-Type: text/css
 * - Cache-Control: public, max-age=3600, s-maxage=7200
 * - ETag: 内容哈希
 *
 * 支持条件请求:
 * - If-None-Match: 如果ETag匹配，返回304
 */
export const GET = withFontApiAuth(async (request) => {
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
    const { css, etag } = await cssService.generateCSS({
      family,
      version,
      weight,
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
});
