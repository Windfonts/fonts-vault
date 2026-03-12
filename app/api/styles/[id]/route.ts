import { handleApiError, withAdmin } from '@/lib/auth/api-guard';
import { styleService } from '@/lib/services/style.service';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';

const styleUpdateSchema = z.object({
  name: z.string().min(1, '名称不能为空').optional(),
  slug: z.string().min(1, 'Slug 不能为空').optional(),
  description: z.string().optional(),
  order: z.number().int().min(0).optional(),
});

/**
 * GET /api/styles/[id]
 * 获取单个风格
 * 公开访问
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const style = await styleService.findById(id);

    if (!style) {
      return NextResponse.json(
        {
          code: 404,
          message: '风格不存在',
          status: 'fail',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      code: 200,
      data: style,
      message: '获取风格成功',
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/styles/[id]
 * 更新风格
 * 需要管理员认证
 */
export const PUT = withAdmin(
  async (req: NextRequest, _session, ctx?: { params?: Promise<{ id: string }> | { id: string } }) => {
    try {
      if (!ctx?.params) {
        return NextResponse.json(
          {
            code: 400,
            message: '缺少参数',
            status: 'fail',
          },
          { status: 400 }
        );
      }
      const { id } = await Promise.resolve(ctx.params);
      const body = await req.json();

      // 验证数据
      const validated = styleUpdateSchema.parse(body);

      // 更新风格
      const style = await styleService.update(id, validated);

      return NextResponse.json({
        code: 200,
        data: style,
        message: '更新风格成功',
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

      if (error instanceof Error && error.message.includes('不存在')) {
        return NextResponse.json(
          {
            code: 404,
            message: error.message,
            status: 'fail',
          },
          { status: 404 }
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
);

/**
 * DELETE /api/styles/[id]
 * 删除风格
 * 需要管理员认证
 */
export const DELETE = withAdmin(
  async (req: NextRequest, _session, ctx?: { params?: Promise<{ id: string }> | { id: string } }) => {
    try {
      if (!ctx?.params) {
        return NextResponse.json(
          {
            code: 400,
            message: '缺少参数',
            status: 'fail',
          },
          { status: 400 }
        );
      }
      const { id } = await Promise.resolve(ctx.params);
      await styleService.delete(id);

      return NextResponse.json({
        code: 200,
        message: '删除风格成功',
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('不存在')) {
        return NextResponse.json(
          {
            code: 404,
            message: error.message,
            status: 'fail',
          },
          { status: 404 }
        );
      }

      return handleApiError(error);
    }
  }
);
