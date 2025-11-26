import { handleApiError, withAdmin } from '@/lib/auth/api-guard';
import { styleService } from '@/lib/services/style.service';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';

const styleCreateSchema = z.object({
  name: z.string().min(1, '名称不能为空'),
  slug: z.string().min(1, 'Slug 不能为空'),
  description: z.string().optional(),
  order: z.number().int().min(0).default(0),
});

/**
 * GET /api/styles
 * 获取所有风格
 * 公开访问
 */
export async function GET() {
  try {
    const styles = await styleService.findAll();

    return NextResponse.json({
      code: 200,
      data: styles,
      message: '获取风格列表成功',
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/styles
 * 创建风格
 * 需要管理员认证
 */
export const POST = withAdmin(async (req: NextRequest) => {
  try {
    const body = await req.json();

    // 验证数据
    const validated = styleCreateSchema.parse(body);

    // 创建风格
    const style = await styleService.create(validated);

    return NextResponse.json(
      {
        code: 200,
        data: style,
        message: '创建风格成功',
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
