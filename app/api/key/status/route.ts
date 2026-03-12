import { withFontApiAuth } from '@/lib/api/font-api-auth';
import { NextResponse } from 'next/server';

export const GET = withFontApiAuth(
  async (_request, ctx) => {
    if (!ctx.apiKey) {
      return NextResponse.json(
        { code: 401, message: '缺少 API 密钥', errorCode: 'missing_api_key' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      code: 200,
      data: {
        valid: true,
        key: {
          id: ctx.apiKey.id,
          name: ctx.apiKey.name,
          ownerEmail: ctx.apiKey.ownerEmail,
          expiresAt: ctx.apiKey.expiresAt ? ctx.apiKey.expiresAt.toISOString() : null,
          plan: ctx.apiKey.plan,
        },
        quota: ctx.quota,
        day: ctx.day,
        domain: ctx.domain,
      },
      message: '查询成功',
    });
  },
  { requireKey: true }
);
