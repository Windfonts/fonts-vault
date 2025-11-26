import { handleApiError } from '@/lib/auth/api-guard';
import { fontService } from '@/lib/services/font.service';
import { fontUpdateSchema } from '@/lib/services/validation';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * GET /api/fonts/[id]
 * 获取字体详情
 * 公开访问
 * 支持通过 ID 或 normalizedName 查询
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    // 尝试通过 normalizedName 查询，如果失败则通过 ID 查询
    let font = await fontService.findByNormalizedName(id);
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

    // 增加浏览次数
    await fontService.incrementViewCount(font.id);

    return NextResponse.json({
      code: 200,
      data: font,
      message: '获取字体详情成功',
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/fonts/[id]
 * 更新字体
 * 需要管理员认证
 * 支持通过 ID 或 normalizedName 查询
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // 验证管理员权限
    const { verifyAdmin } = await import('@/lib/auth/api-guard');
    await verifyAdmin();

    const { id } = params;
    const body = await req.json();

    // 检查字体是否存在 - 支持 normalizedName 或 ID
    let existing = await fontService.findByNormalizedName(id);
    if (!existing) {
      existing = await fontService.findById(id);
    }

    if (!existing) {
      return NextResponse.json(
        {
          code: 404,
          message: '字体不存在',
          status: 'fail',
        },
        { status: 404 }
      );
    }

    // 验证数据（部分更新）
    const validated = fontUpdateSchema.partial().parse(body);

    // 更新字体 - 使用实际的 ID
    const font = await fontService.update(existing.id, validated);

    return NextResponse.json({
      code: 200,
      data: font,
      message: '更新字体成功',
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
}

/**
 * DELETE /api/fonts/[id]
 * 删除字体
 * 需要管理员认证
 * 支持通过 ID 或 normalizedName 查询
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // 验证管理员权限
    const { verifyAdmin } = await import('@/lib/auth/api-guard');
    await verifyAdmin();

    const { id } = params;

    // 检查字体是否存在 - 支持 normalizedName 或 ID
    let existing = await fontService.findByNormalizedName(id);
    if (!existing) {
      existing = await fontService.findById(id);
    }

    if (!existing) {
      return NextResponse.json(
        {
          code: 404,
          message: '字体不存在',
          status: 'fail',
        },
        { status: 404 }
      );
    }

    // 删除字体 - 使用实际的 ID
    await fontService.delete(existing.id);

    return NextResponse.json({
      code: 200,
      message: '删除字体成功',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
