import { NextRequest, NextResponse } from 'next/server';
import { categoryService } from '@/lib/services/category.service';
import { categoryUpdateSchema } from '@/lib/services/validation';
import { handleApiError } from '@/lib/auth/api-guard';
import { ZodError } from 'zod';

/**
 * GET /api/categories/[id]
 * 获取分类详情
 * 公开访问
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const category = await categoryService.findById(params.id);

    if (!category) {
      return NextResponse.json(
        {
          code: 404,
          message: '分类不存在',
          status: 'fail',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      code: 200,
      data: category,
      message: '获取分类详情成功',
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/categories/[id]
 * 更新分类
 * 需要管理员认证
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // 验证管理员权限
    const { verifyAdmin } = await import('@/lib/auth/api-guard');
    await verifyAdmin();

    const body = await req.json();

    // 验证数据
    const validated = categoryUpdateSchema.parse(body);

    // 更新分类
    const category = await categoryService.update(params.id, validated);

    return NextResponse.json({
      code: 200,
      data: category,
      message: '更新分类成功',
    });
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

    if (error instanceof Error) {
      if (error.message.includes('不存在')) {
        return NextResponse.json(
          {
            code: 404,
            message: error.message,
            status: 'fail',
          },
          { status: 404 }
        );
      }

      if (error.message.includes('已存在')) {
        return NextResponse.json(
          {
            code: 422,
            message: error.message,
            status: 'fail',
          },
          { status: 422 }
        );
      }
    }

    return handleApiError(error);
  }
}

/**
 * DELETE /api/categories/[id]
 * 删除分类
 * 需要管理员认证
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // 验证管理员权限
    const { verifyAdmin } = await import('@/lib/auth/api-guard');
    await verifyAdmin();

    await categoryService.delete(params.id);

    return NextResponse.json({
      code: 200,
      message: '删除分类成功',
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('不存在')) {
        return NextResponse.json(
          {
            code: 404,
            message: error.message,
            status: 'fail',
          },
          { status: 404 }
        );
      }

      if (error.message.includes('关联')) {
        return NextResponse.json(
          {
            code: 409,
            message: error.message,
            status: 'fail',
          },
          { status: 409 }
        );
      }
    }

    return handleApiError(error);
  }
}
