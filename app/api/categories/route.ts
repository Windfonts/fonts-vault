import { NextRequest, NextResponse } from 'next/server';
import { categoryService } from '@/lib/services/category.service';
import { categoryCreateSchema } from '@/lib/services/validation';
import { withAdmin, handleApiError } from '@/lib/auth/api-guard';
import { ZodError } from 'zod';

/**
 * GET /api/categories
 * 获取分类列表
 * 公开访问
 */
export async function GET(req: NextRequest) {
  try {
    const categories = await categoryService.findAll();

    return NextResponse.json({
      code: 200,
      data: categories,
      message: '获取分类列表成功',
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/categories
 * 创建分类
 * 需要管理员认证
 */
export const POST = withAdmin(async (req: NextRequest) => {
  try {
    const body = await req.json();

    // 验证数据
    const validated = categoryCreateSchema.parse(body);

    // 创建分类
    const category = await categoryService.create(validated);

    return NextResponse.json(
      {
        code: 200,
        data: category,
        message: '创建分类成功',
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
