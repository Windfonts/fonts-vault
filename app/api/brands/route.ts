import { handleApiError, withAdmin } from '@/lib/auth/api-guard';
import { brandService } from '@/lib/services/brand.service';
import { brandCreateSchema } from '@/lib/services/validation';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * GET /api/brands
 * 获取品牌列表
 * 公开访问
 */
export async function GET() {
  try {
    const brands = await brandService.findAll();

    return NextResponse.json({
      code: 200,
      data: brands,
      message: '获取品牌列表成功',
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/brands
 * 创建品牌
 * 需要管理员认证
 */
export const POST = withAdmin(async (req: NextRequest) => {
  try {
    const body = await req.json();

    // 验证数据
    const validated = brandCreateSchema.parse(body);

    // 创建品牌
    const brand = await brandService.create(validated);

    return NextResponse.json(
      {
        code: 200,
        data: brand,
        message: '创建品牌成功',
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
