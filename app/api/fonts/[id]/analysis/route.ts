import { withFontApiAuth } from '@/lib/api/font-api-auth';
import { handleApiError } from '@/lib/auth/api-guard';
import { fontService } from '@/lib/services/font.service';
import { syncService } from '@/lib/services/sync.service';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/fonts/[id]/analysis
 * 获取字体的字符分析数据
 * 公开访问
 */
const handleGet = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;

    // 获取字体信息 - 支持 normalizedName、fontFamily 或 ID
    let font = await fontService.findByNormalizedName(id);
    if (!font) {
      const byFamily = await fontService.findByFontFamily(id);
      if (byFamily && byFamily.length > 0) {
        font = byFamily.find((f) => f.status === 'published') || byFamily[0];
      }
    }
    if (!font) {
      font = await fontService.findById(id);
    }

    if (!font) {
      return NextResponse.json(
        {
          code: 404,
          message: '字体不存在',
          status: 'fail',
        },
        { status: 404 }
      );
    }

    // 获取字体分析数据
    const analysis = await syncService.fetchFontAnalysis(font.normalizedName);

    if (!analysis) {
      return NextResponse.json(
        {
          code: 404,
          message: '字体分析数据不存在',
          status: 'fail',
          data: {
            normalizedName: font.normalizedName,
            hint: '该字体可能尚未生成分析数据',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      code: 200,
      data: analysis,
      message: '获取字体分析数据成功',
    });
  } catch (error) {
    return handleApiError(error, { url: req.url, method: req.method });
  }
};

export const GET = async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const wrapped = withFontApiAuth((request) => handleGet(request as NextRequest, ctx));
  return wrapped(req);
};
