import { withFontApiAuth } from '@/lib/api/font-api-auth';
import { handleApiError, withAdmin } from '@/lib/auth/api-guard';
import { fontService } from '@/lib/services/font.service';
import { fontCreateSchema, type FontFilterDto } from '@/lib/services/validation';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * GET /api/fonts
 * 获取字体列表（支持分页和筛选）
 * 公开访问
 */
export const GET = withFontApiAuth(async (req) => {
  const nextRequest = req as NextRequest;
  try {
    const { searchParams } = new URL(nextRequest.url);

    // 解析查询参数
    const filters: Partial<FontFilterDto> = {};

    const pageParam = searchParams.get('page');
    if (pageParam) {
      filters.page = parseInt(pageParam);
    }

    const sizeParam = searchParams.get('size');
    if (sizeParam) {
      filters.size = parseInt(sizeParam);
    }

    const categoryIdParam = searchParams.get('categoryId');
    if (categoryIdParam) {
      filters.categoryId = categoryIdParam;
    }

    const brandIdParam = searchParams.get('brandId');
    if (brandIdParam) {
      filters.brandId = brandIdParam;
    }

    const searchParam = searchParams.get('search');
    if (searchParam) {
      filters.search = searchParam;
    }

    const tagsParam = searchParams.get('tags');
    if (tagsParam) {
      filters.tags = tagsParam.split(',').filter(Boolean);
    }

    const licenseTypeParam = searchParams.get('licenseType');
    if (licenseTypeParam) {
      filters.licenseType = licenseTypeParam;
    }

    const statusParam = searchParams.get('status');
    if (statusParam) {
      filters.status = statusParam as 'draft' | 'published' | 'offline';
    }

    const sortParam = searchParams.get('sort');
    if (
      sortParam === 'name' ||
      sortParam === 'createdAt' ||
      sortParam === 'viewCount' ||
      sortParam === 'downloadCount'
    ) {
      filters.sort = sortParam;
    }

    const orderParam = searchParams.get('order');
    if (orderParam === 'asc' || orderParam === 'desc') {
      filters.order = orderParam;
    }

    // 获取字体列表（带关联数据）
    const result = await fontService.findAllWithRelations(filters);

    return NextResponse.json({
      code: 200,
      data: result,
      message: '获取字体列表成功',
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          code: 400,
          message: '请求参数验证失败',
          status: 'fail',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    return handleApiError(error);
  }
});

/**
 * POST /api/fonts
 * 创建字体
 * 需要管理员认证
 */
export const POST = withAdmin(async (req: NextRequest) => {
  try {
    const body = await req.json();

    // 验证数据
    const validated = fontCreateSchema.parse(body);

    // 创建字体
    const font = await fontService.create(validated);

    return NextResponse.json(
      {
        code: 200,
        data: font,
        message: '创建字体成功',
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          code: 400,
          message: '数据验证失败',
          status: 'fail',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes('已存在')) {
      return NextResponse.json(
        {
          code: 422,
          message: error.message,
          status: 'fail',
        },
        { status: 422 }
      );
    }

    return handleApiError(error);
  }
});
