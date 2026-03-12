import { withFontApiAuth } from '@/lib/api/font-api-auth';
import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/proxy/[...path]
 * 代理OSS字体文件请求
 *
 * 用途：
 * - 隐藏OSS直接地址
 * - 添加CORS头
 * - 统一缓存策略
 * - 记录访问日志
 */
const handleGet = async (request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) => {
  try {
    const { path } = await ctx.params;
    const normalizedPath = path.join('/');

    // 构建OSS URL
    const ossEndpoint =
      process.env.OSS_ENDPOINT || 'https://wenfeng-fonts.oss-cn-guangzhou.aliyuncs.com';
    const ossUrl = `${ossEndpoint}/${normalizedPath}`;

    logger.debug('[API-proxy] 代理字体文件请求', {
      path: normalizedPath,
      ossUrl,
    });

    // 请求OSS文件
    const response = await fetch(ossUrl, {
      headers: {
        'User-Agent': 'Font-Management-System/1.0',
      },
    });

    if (!response.ok) {
      logger.warn('[API-proxy] OSS文件请求失败', {
        path: normalizedPath,
        status: response.status,
        statusText: response.statusText,
      });

      return NextResponse.json(
        {
          code: response.status,
          message: '字体文件不存在或无法访问',
          status: 'fail',
        },
        { status: response.status }
      );
    }

    // 获取文件内容
    const buffer = await response.arrayBuffer();

    // 确定Content-Type
    const contentType = response.headers.get('content-type') || getContentType(normalizedPath);
    const lowerContentType = contentType.toLowerCase();

    if (
      lowerContentType.startsWith('text/') ||
      lowerContentType.includes('application/json')
    ) {
      const text = new TextDecoder().decode(buffer);
      if (
        text.includes('failed to instantiate the resolver') ||
        text.includes('network is unreachable')
      ) {
        return NextResponse.json(
          {
            code: 502,
            message: '字体文件上游网络不可达，请检查 OSS 访问环境或改用直连',
            status: 'error',
          },
          { status: 502 }
        );
      }
    }

    // 返回文件内容
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    logger.error('[API-proxy] 代理请求失败', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        code: 500,
        message: '代理请求失败',
        status: 'error',
      },
      { status: 500 }
    );
  }
};

export const GET = async (request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) => {
  const wrapped = withFontApiAuth((req) => handleGet(req as NextRequest, ctx));
  return wrapped(request);
};

/**
 * OPTIONS /api/proxy/[...path]
 * 处理CORS预检请求
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * 根据文件扩展名确定Content-Type
 */
function getContentType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'woff2':
      return 'font/woff2';
    case 'woff':
      return 'font/woff';
    case 'ttf':
      return 'font/ttf';
    case 'otf':
      return 'font/otf';
    case 'eot':
      return 'application/vnd.ms-fontobject';
    default:
      return 'application/octet-stream';
  }
}
