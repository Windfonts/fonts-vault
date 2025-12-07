import { handleApiError } from '@/lib/auth/api-guard';
import { brandService } from '@/lib/services/brand.service';
import { brandUpdateSchema } from '@/lib/services/validation';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * GET /api/brands/[id]
 * 获取品牌详情
 * 公开访问
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const brand = await brandService.findById(id);

    if (!brand) {
      return NextResponse.json(
        {
          code: 404,
          message: '品牌不存在',
          status: 'fail',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      code: 200,
      data: brand,
      message: '获取品牌详情成功',
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/brands/[id]
 * 更新品牌
 * 需要管理员认证
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // 验证管理员权限
    const { verifyAdmin } = await import('@/lib/auth/api-guard');
    await verifyAdmin();

    const { id } = await params;
    const body = await req.json();

    // 验证数据
    const validated = brandUpdateSchema.parse(body);

    // 更新品牌
    const brand = await brandService.update(id, validated);

    return NextResponse.json({
      code: 200,
      data: brand,
      message: '更新品牌成功',
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
 * DELETE /api/brands/[id]
 * 删除品牌
 * 需要管理员认证
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // 验证管理员权限
    const { verifyAdmin } = await import('@/lib/auth/api-guard');
    await verifyAdmin();

    const { id } = await params;
    await brandService.delete(id);

    return NextResponse.json({
      code: 200,
      message: '删除品牌成功',
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
